"""Simplified TTS service using ChatterboxTTS."""

import logging
from pathlib import Path
import torchaudio as ta
from chatterbox.tts import ChatterboxTTS

from app.config import settings

logger = logging.getLogger(__name__)


class SimpleTTS:
    """Simple TTS wrapper for ChatterboxTTS."""

    def __init__(self):
        """Initialize TTS model."""
        self.model = None
        self.device = settings.TTS_DEVICE

    def _ensure_model_loaded(self):
        """Lazy load model on first use."""
        if self.model is None:
            logger.info(f"Loading ChatterboxTTS model on device: {self.device}")
            self.model = ChatterboxTTS.from_pretrained(device=self.device)
            logger.info("Model loaded successfully")

    def generate(self, text: str, reference_audio_path: Path) -> Path:
        """
        Generate speech from text using reference audio.

        Args:
            text: Text to synthesize
            reference_audio_path: Path to reference audio file

        Returns:
            Path to generated audio file
        """
        self._ensure_model_loaded()

        if not reference_audio_path.exists():
            raise FileNotFoundError(f"Reference audio not found: {reference_audio_path}")

        logger.info(f"Generating speech for text: {text[:50]}...")

        # Generate audio
        wav = self.model.generate(text, audio_prompt_path=str(reference_audio_path))

        # Save to output file
        output_path = settings.DATA_DIR / "output.wav"
        ta.save(str(output_path), wav, self.model.sr)

        logger.info(f"Speech generated and saved to: {output_path}")
        return output_path


# Global TTS instance
tts_service = SimpleTTS()
