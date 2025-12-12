"""FastAPI application entry point."""

from contextlib import asynccontextmanager
import logging

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.api import router as api_router

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)

# Silence noisy loggers
logging.getLogger("uvicorn.access").setLevel(logging.WARNING)

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup
    logger.info("Starting Prove voice cloning backend (simplified)")

    # Ensure directories exist
    settings.AUDIO_DIR.mkdir(parents=True, exist_ok=True)
    settings.MODEL_DIR.mkdir(parents=True, exist_ok=True)
    settings.DATA_DIR.mkdir(parents=True, exist_ok=True)

    logger.info("Directory structure verified")

    yield

    # Shutdown
    logger.info("Shutting down Prove voice cloning backend")


app = FastAPI(
    title="Prove Voice Cloning API - Simplified",
    description="Minimal voice cloning system using audio reference",
    version="0.2.0",
    lifespan=lifespan,
)


@app.get("/api/v1/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "environment": settings.APP_ENV,
        "debug": settings.DEBUG,
    }


# Include simplified API router
app.include_router(api_router, prefix="/api/v1")

# Mount static files (must be after API routes so API takes precedence)
app.mount("/", StaticFiles(directory="static", html=True), name="static")
