"""Simplified API with 3 endpoints."""

import asyncio
import logging
from datetime import datetime
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel

from app.config import settings
from app.training import trainer_service
from app.tts import tts_service

logger = logging.getLogger(__name__)

router = APIRouter()


class SynthesisRequest(BaseModel):
    """Request model for speech synthesis."""

    text: str


class StatusResponse(BaseModel):
    """Response model for training status."""

    status: str
    audio_count: int
    last_trained: str | None


class UploadResponse(BaseModel):
    """Response model for audio upload."""

    status: str
    audio_count: int


@router.post("/upload", response_model=UploadResponse)
async def upload_audio(file: UploadFile = File(...)):
    """
    Upload audio file.

    This endpoint:
    1. Saves the uploaded audio to data/audio/
    2. Triggers automatic concatenation/training
    3. Returns the updated audio count
    """
    try:
        from pydub import AudioSegment
        import tempfile

        # Ensure audio directory exists
        settings.AUDIO_DIR.mkdir(parents=True, exist_ok=True)

        # Generate filename with timestamp
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

        # Read uploaded file content
        content = await file.read()

        # Determine input format from content type
        input_format = "wav"
        if file.content_type:
            if "webm" in file.content_type:
                input_format = "webm"
            elif "mp4" in file.content_type or "m4a" in file.content_type:
                input_format = "mp4"

        # Save to temporary file first
        with tempfile.NamedTemporaryFile(suffix=f".{input_format}", delete=False) as tmp:
            tmp.write(content)
            tmp_path = tmp.name

        try:
            # Convert to WAV using pydub
            audio = AudioSegment.from_file(tmp_path, format=input_format)

            # Save as WAV
            wav_filename = f"{timestamp}.wav"
            wav_filepath = settings.AUDIO_DIR / wav_filename
            audio.export(str(wav_filepath), format="wav")

            logger.info(f"Audio converted and saved: {wav_filepath} ({len(content)} bytes)")
        finally:
            # Clean up temp file
            Path(tmp_path).unlink(missing_ok=True)

        # Get audio count
        audio_count = len(list(settings.AUDIO_DIR.glob("*.wav")))

        # Trigger training in background (with small delay to ensure file is flushed)
        async def delayed_train():
            await asyncio.sleep(0.5)  # Wait 500ms for file system flush
            await trainer_service.train()

        asyncio.create_task(delayed_train())

        return UploadResponse(status="success", audio_count=audio_count)

    except Exception as e:
        logger.error(f"Upload failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status", response_model=StatusResponse)
async def get_status():
    """
    Get training status.

    Returns:
        Current training status including:
        - status: "idle", "training", "ready", or "error"
        - audio_count: Number of uploaded audio files
        - last_trained: ISO timestamp of last training
    """
    try:
        status = trainer_service.get_status()
        return StatusResponse(
            status=status["status"],
            audio_count=status["audio_count"],
            last_trained=status.get("last_trained"),
        )
    except Exception as e:
        logger.error(f"Failed to get status: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/synthesize")
async def synthesize(request: SynthesisRequest):
    """
    Synthesize speech from text.

    Args:
        request: Contains the text to synthesize

    Returns:
        WAV audio file with synthesized speech
    """
    try:
        # Check if reference audio exists
        reference_path = settings.MODEL_DIR / "reference.wav"
        if not reference_path.exists():
            raise HTTPException(
                status_code=400, detail="No reference audio available. Please upload audio first."
            )

        # Validate text
        if not request.text or len(request.text.strip()) == 0:
            raise HTTPException(status_code=400, detail="Text cannot be empty")

        if len(request.text) > 500:
            raise HTTPException(status_code=400, detail="Text too long (max 500 characters)")

        logger.info(f"Synthesizing text: {request.text[:50]}...")

        # Generate speech
        output_path = tts_service.generate(request.text, reference_path)

        # Return audio file
        return FileResponse(path=str(output_path), media_type="audio/wav", filename="synthesis.wav")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Synthesis failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
