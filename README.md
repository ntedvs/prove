# Prove

**Minimal voice cloning system using audio reference**

Prove is a lightweight web application that enables voice cloning through simple audio recordings. Upload voice samples, and the system generates speech in your voice from any text input.

## Overview

Prove uses [ChatterboxTTS](https://github.com/chatterbox-ai/chatterbox-tts) for zero-shot voice cloning - no traditional ML training required. Simply record 10-20 seconds of your voice, and the system can synthesize new speech that sounds like you.

### Who Is This For?

- **Developers** prototyping voice applications
- **Content creators** exploring voice synthesis
- **Researchers** experimenting with TTS systems
- **Hobbyists** interested in voice cloning technology

### Key Features

- ✅ **Zero-shot voice cloning** - Works with minimal audio samples
- ✅ **Web-based interface** - Record directly in browser via Web Audio API
- ✅ **Real-time synthesis** - Generate speech on-demand
- ✅ **No ML training** - Uses audio concatenation + reference-based TTS
- ✅ **Privacy-focused** - All processing happens locally
- ✅ **Simple architecture** - FastAPI backend + vanilla JavaScript frontend

## Architecture

```
┌─────────────────────────────────────────────────┐
│                  Web Browser                     │
│  ┌──────────────────────────────────────────┐   │
│  │  Frontend (Vanilla JS)                   │   │
│  │  - Audio recording (Web Audio API)       │   │
│  │  - Real-time status updates              │   │
│  │  - Synthesis playback                    │   │
│  └──────────────────────────────────────────┘   │
└─────────────────┬───────────────────────────────┘
                  │ HTTP/REST
┌─────────────────▼───────────────────────────────┐
│           FastAPI Backend                        │
│  ┌──────────────────────────────────────────┐   │
│  │  API Layer (app/api.py)                  │   │
│  │  - /upload   - Upload voice samples      │   │
│  │  - /status   - Training status           │   │
│  │  - /synthesize - Generate speech         │   │
│  └──────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────┐   │
│  │  Training Service (app/training.py)      │   │
│  │  - Audio concatenation                   │   │
│  │  - Reference model creation              │   │
│  └──────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────┐   │
│  │  TTS Service (app/tts.py)                │   │
│  │  - ChatterboxTTS wrapper                 │   │
│  │  - Speech synthesis                      │   │
│  └──────────────────────────────────────────┘   │
└──────────────────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────┐
│              Data Storage                        │
│  data/audio/     - Uploaded voice samples       │
│  data/model/     - Reference audio (reference.wav)│
│  data/           - Output & status files         │
└──────────────────────────────────────────────────┘
```

### How It Works

1. **Record** - User records voice samples via browser microphone
2. **Upload** - Audio sent to backend, converted to WAV format
3. **Concatenate** - All samples merged into single reference file (last 20s)
4. **Synthesize** - ChatterboxTTS generates speech using reference audio
5. **Playback** - Synthesized audio returned to browser for playback

**Note:** This system doesn't train a neural network. Instead, it concatenates your audio samples and uses them as a reference for ChatterboxTTS's zero-shot voice cloning.

## Installation

### Requirements

- **Python**: 3.11.x (required)
- **UV**: Package manager ([install](https://docs.astral.sh/uv/))
- **FFmpeg**: Audio processing (required by pydub)

#### Install FFmpeg

**macOS:**
```bash
brew install ffmpeg
```

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install ffmpeg
```

**Windows:**
Download from [ffmpeg.org](https://ffmpeg.org/download.html)

### Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/prove.git
   cd prove
   ```

2. **Install dependencies:**
   ```bash
   uv sync
   ```

3. **Configure environment (optional):**
   ```bash
   cp .env.example .env
   # Edit .env to customize settings
   ```

   Key settings:
   - `TTS_DEVICE`: `cpu`, `cuda`, or `mps` (Apple Silicon)
   - `SAMPLE_RATE`: Audio sample rate (default: 16000)
   - `LOG_LEVEL`: `INFO`, `DEBUG`, `WARNING`

4. **Run the application:**
   ```bash
   uv run uvicorn app.main:app --host 0.0.0.0 --port 8000
   ```

5. **Open in browser:**
   ```
   http://localhost:8000
   ```

## Usage

### Recording Voice Samples

1. Click **"Start Recording"** and speak clearly for 10-20 seconds
2. Click **"Stop Recording"**
3. **"Play"** to review your recording (optional)
4. Click **"Upload"** to add to your voice model

**Tips:**
- Record 2-3 samples for better quality
- Speak naturally in various tones
- Avoid background noise
- Each upload auto-updates the voice model

### Generating Speech

1. Wait for status badge to show **"Ready"**
2. Enter text in the synthesis box (max 500 characters)
3. Click **"Generate Speech"**
4. Audio player appears with your synthesized voice

### Example API Usage

```python
import httpx

# Upload audio
with open("sample.wav", "rb") as f:
    response = httpx.post(
        "http://localhost:8000/api/v1/upload",
        files={"file": f}
    )
print(response.json())  # {"status": "success", "audio_count": 1}

# Check status
response = httpx.get("http://localhost:8000/api/v1/status")
print(response.json())
# {"status": "ready", "audio_count": 1, "last_trained": "2025-12-12T..."}

# Synthesize speech
response = httpx.post(
    "http://localhost:8000/api/v1/synthesize",
    json={"text": "Hello, this is my cloned voice!"}
)
with open("output.wav", "wb") as f:
    f.write(response.content)
```

## API Reference

### Endpoints

#### `POST /api/v1/upload`
Upload voice sample for training.

**Request:**
- Multipart form data with `file` field
- Supported formats: WAV, WebM, MP4, M4A

**Response:**
```json
{
  "status": "success",
  "audio_count": 2
}
```

#### `GET /api/v1/status`
Get current training status.

**Response:**
```json
{
  "status": "ready",
  "audio_count": 2,
  "last_trained": "2025-12-12T02:50:54.959107"
}
```

Status values: `idle`, `training`, `ready`, `error`

#### `POST /api/v1/synthesize`
Generate speech from text.

**Request:**
```json
{
  "text": "Text to synthesize (max 500 chars)"
}
```

**Response:**
- Audio file (WAV format)
- Content-Type: `audio/wav`

#### `GET /api/v1/health`
Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "environment": "development",
  "debug": true
}
```

## Development

### Running Tests

```bash
uv run pytest
```

### Code Quality

```bash
# Linting
uv run ruff check app/

# Formatting
uv run black app/

# Type checking
uvx ty check
```

### Project Structure

```
prove/
├── app/
│   ├── __init__.py
│   ├── main.py          # FastAPI app & lifespan
│   ├── api.py           # API endpoints
│   ├── config.py        # Settings & configuration
│   ├── training.py      # Audio concatenation logic
│   └── tts.py           # ChatterboxTTS wrapper
├── static/
│   ├── index.html       # Main UI
│   ├── css/style.css    # Styles
│   └── js/
│       ├── app.js       # Main app logic
│       ├── api.js       # API client
│       └── recorder.js  # Audio recording
├── data/                # Data directory (created at runtime)
│   ├── audio/           # Uploaded samples
│   ├── model/           # Reference audio
│   └── training_status.json
├── tests/               # Test suite
├── pyproject.toml       # Dependencies & config
├── uv.lock              # Dependency lockfile
└── README.md
```

## Troubleshooting

### "Microphone access denied"
- Enable microphone permissions in browser settings
- Use HTTPS in production (required for getUserMedia)

### "No reference audio available"
- Upload at least one voice sample first
- Check `data/model/reference.wav` exists

### Poor voice quality
- Record more samples (2-3 recommended)
- Ensure clear audio with minimal background noise
- Speak naturally with varied intonation

### CUDA/MPS not working
- Set `TTS_DEVICE=cpu` in `.env` as fallback
- Verify PyTorch CUDA/MPS installation

## License

[Add your license here]

## Acknowledgments

- [ChatterboxTTS](https://github.com/chatterbox-ai/chatterbox-tts) - Zero-shot TTS engine
- [FastAPI](https://fastapi.tiangolo.com/) - Web framework
- [PyDub](https://github.com/jiaaro/pydub) - Audio processing
