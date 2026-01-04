# Timelapser Development Guidelines

Auto-generated from all feature plans. Last updated: 2025-12-31

## Active Technologies

- Python 3.11+ + FastAPI (001-rtsp-preview, backend)
- TypeScript + Next.js 14 (001-rtsp-preview, frontend)
- ffmpeg (video transcoding, HLS generation)
- hls.js + Video.js (browser video player)

## Project Structure

```text
backend/
├── src/
│   ├── api/routes/         # FastAPI route handlers
│   ├── models/             # Pydantic models
│   ├── services/           # Business logic (RTSP, HLS, ffmpeg)
│   └── core/               # Configuration, exceptions
├── tests/
│   ├── unit/
│   └── integration/
└── requirements.txt

frontend/
├── src/
│   ├── app/                # Next.js app router pages
│   ├── components/         # React components
│   ├── services/           # API client, localStorage
│   ├── types/              # TypeScript type definitions
│   └── hooks/              # Custom React hooks
├── tests/
└── package.json
```

## Commands

**Backend**:
```bash
cd backend
python -m pytest tests/ -v              # Run tests
uvicorn src.main:app --reload           # Start dev server
ruff check src/                         # Lint code
ruff format src/                        # Format code
```

**Frontend**:
```bash
cd frontend
npm test                                # Run tests
npm run dev                             # Start dev server
npm run build                           # Production build
npm run lint                            # Lint code
```

## Code Style

**Python (FastAPI Backend)**:
- Follow PEP 8 style guide
- Use type hints for all function signatures
- Async/await for I/O operations (FastAPI async endpoints)
- Pydantic models for request/response validation
- FastAPI dependency injection for shared resources

**TypeScript (Next.js Frontend)**:
- Use TypeScript strict mode
- Functional components with hooks (no class components)
- Named exports for components
- Type all props and state
- Use Next.js App Router patterns (not Pages Router)

## Architecture Patterns

**Backend**:
- Service layer pattern: API routes delegate to service classes
- Process management: ffmpeg runs as subprocess, tracked in memory
- HLS serving: Static file serving of transcoded segments
- Error handling: Custom exception classes with HTTP status mapping

**Frontend**:
- Component composition: Small, focused components
- Custom hooks: Encapsulate logic (useCamera, useSavedCameras)
- localStorage: Saved camera configurations (no credentials)
- Session state: Connection status, credentials in React state/memory

## Key Technologies

**RTSP to Browser**: HLS transcoding via ffmpeg (H.264/H.265 only)

**Video Player**: hls.js for HLS playback in browser

**Hardware Acceleration**: h264_v4l2m2m codec for Raspberry Pi 5

## Recent Changes

- 001-rtsp-preview: Added Python 3.11 + FastAPI backend, Next.js 14 frontend, HLS streaming via ffmpeg

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
