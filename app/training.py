"""Simplified training service - audio concatenation."""

import json
import logging
from datetime import datetime
from pathlib import Path
from pydub import AudioSegment

from app.config import settings

logger = logging.getLogger(__name__)


class SimpleTrainer:
    """Simple trainer that concatenates audio files."""

    def __init__(self):
        """Initialize trainer."""
        self.audio_dir = settings.AUDIO_DIR
        self.model_dir = settings.MODEL_DIR
        self.status_file = settings.STATUS_FILE

    def concatenate_audio(self) -> Path:
        """
        Concatenate all audio files into a single reference file.

        Returns:
            Path to the concatenated reference audio file
        """
        # Ensure directories exist
        self.audio_dir.mkdir(parents=True, exist_ok=True)
        self.model_dir.mkdir(parents=True, exist_ok=True)

        # Get all audio files sorted by modification time
        audio_files = sorted(self.audio_dir.glob("*.wav"), key=lambda p: p.stat().st_mtime)

        if not audio_files:
            raise ValueError("No audio files found to concatenate")

        logger.info(f"Found {len(audio_files)} audio file(s) to concatenate")

        # If only one file, just copy it
        if len(audio_files) == 1:
            logger.info(f"Single file found, using as reference: {audio_files[0].name}")
            audio = AudioSegment.from_wav(str(audio_files[0]))
            combined = audio
        else:
            # Concatenate all files
            combined = AudioSegment.empty()
            for audio_file in audio_files:
                try:
                    audio = AudioSegment.from_wav(str(audio_file))
                    combined += audio
                    logger.debug(f"Added {audio_file.name}: {len(audio)}ms")
                except Exception as e:
                    logger.warning(f"Failed to process {audio_file.name}: {e}")

        # Use last 20s (or all if less)
        max_duration_ms = 20000
        if len(combined) > max_duration_ms:
            logger.info(f"Trimming audio from {len(combined)}ms to {max_duration_ms}ms")
            combined = combined[-max_duration_ms:]
        else:
            logger.info(f"Using all audio: {len(combined)}ms")

        # Save reference audio
        reference_path = self.model_dir / "reference.wav"
        combined.export(str(reference_path), format="wav")

        logger.info(f"Concatenated audio saved to: {reference_path} ({len(combined)}ms)")
        return reference_path

    def update_status(self, status: str, audio_count: int):
        """
        Update training status JSON file.

        Args:
            status: Training status (idle, training, ready, error)
            audio_count: Number of audio files
        """
        self.status_file.parent.mkdir(parents=True, exist_ok=True)

        reference_path = self.model_dir / "reference.wav"
        status_data = {
            "status": status,
            "audio_count": audio_count,
            "last_trained": datetime.now().isoformat(),
            "model_path": "data/model/reference.wav" if reference_path.exists() else None,
        }

        self.status_file.write_text(json.dumps(status_data, indent=2))
        logger.info(f"Status updated: {status_data}")

    def get_status(self) -> dict:
        """
        Get current training status.

        Returns:
            Status dictionary
        """
        if not self.status_file.exists():
            # Initialize with default status
            audio_count = len(list(self.audio_dir.glob("*.wav"))) if self.audio_dir.exists() else 0
            return {
                "status": "idle",
                "audio_count": audio_count,
                "last_trained": None,
                "model_path": None,
            }

        return json.loads(self.status_file.read_text())

    async def train(self):
        """
        Perform training (concatenation).

        This is called automatically after each audio upload.
        """
        try:
            logger.info("Starting training (concatenation)...")
            self.update_status("training", len(list(self.audio_dir.glob("*.wav"))))

            # Concatenate audio files
            self.concatenate_audio()

            # Update status to ready
            audio_count = len(list(self.audio_dir.glob("*.wav")))
            self.update_status("ready", audio_count)

            logger.info("Training completed successfully")
        except Exception as e:
            logger.error(f"Training failed: {e}")
            audio_count = len(list(self.audio_dir.glob("*.wav")))
            self.update_status("error", audio_count)
            raise


# Global trainer instance
trainer_service = SimpleTrainer()
