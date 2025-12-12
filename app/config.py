"""Application configuration."""

from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
    )

    # Application
    APP_ENV: str = "development"
    DEBUG: bool = True
    LOG_LEVEL: str = "INFO"

    # Paths
    BASE_DIR: Path = Path(__file__).parent.parent
    DATA_DIR: Path = BASE_DIR / "data"
    AUDIO_DIR: Path = DATA_DIR / "audio"
    MODEL_DIR: Path = DATA_DIR / "model"
    STATUS_FILE: Path = DATA_DIR / "training_status.json"

    # Audio Processing
    SAMPLE_RATE: int = 16000
    MAX_UPLOAD_SIZE_MB: int = 50
    AUDIO_FORMAT: str = "wav"

    # TTS Model (Chatterbox)
    TTS_LANGUAGE: str = "en"
    TTS_DEVICE: str = "mps"  # cpu, cuda, or mps (Apple Silicon)


# Global settings instance
settings = Settings()
