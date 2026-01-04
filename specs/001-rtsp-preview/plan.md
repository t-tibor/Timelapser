# Implementation Plan: RTSP Camera Connection and Video Preview

**Branch**: `001-rtsp-preview` | **Date**: 2025-12-31 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-rtsp-preview/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Enable users to connect to RTSP cameras via web browser and view live video preview. Technical approach uses HLS (HTTP Live Streaming) transcoding via ffmpeg to convert RTSP streams into browser-compatible format. Backend (Python/FastAPI) manages RTSP connections and serves HLS segments. Frontend (Next.js/TypeScript) provides UI and video player (hls.js). Supports H.264/H.265 codecs, single concurrent connection, saved camera configurations (up to 5), and automatic reconnection with exponential backoff.

## Technical Context

**Language/Version**: Python 3.11+ (backend), TypeScript 5+ with Node.js 20 (frontend)  
**Primary Dependencies**: FastAPI 0.104+, uvicorn, ffmpeg, Next.js 14, hls.js, Video.js  
**Storage**: localStorage (browser) for saved camera configurations, ephemeral HLS segments on disk  
**Testing**: pytest (backend), Jest/React Testing Library (frontend)  
**Target Platform**: Linux ARM64 (Raspberry Pi 5) running k3s Kubernetes, modern web browsers  
**Project Type**: Web application (separate backend + frontend)  
**Performance Goals**: <5s connection time, smooth 1080p@30fps playback, <20% CPU with hardware acceleration  
**Constraints**: Single concurrent camera connection, 5 saved cameras maximum, session-only credential storage, ARM64 compatibility required  
**Scale/Scope**: Single user (hobby project), 5-10 concurrent streams maximum on Raspberry Pi 5

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Verify compliance with `.specify/memory/constitution.md`:

- [x] **Pragmatic Simplicity**: Follows YAGNI - HLS approach chosen over complex WebRTC, standard HTTP serving, no speculative features
- [x] **Containerized Deployment**: Both backend/frontend containerized, ARM64 official images available, health checks planned (HTTP endpoints)
- [x] **Async Task Processing**: ffmpeg spawned as subprocess (async), FastAPI async/await for connection handling, non-blocking stream serving
- [x] **Resource Constraints**: Hardware acceleration (h264_v4l2m2m), single connection limit, 2s HLS segments for balance, CPU monitoring
- [x] **Progressive Enhancement**: User stories prioritized P1 (connect), P2 (errors), P3 (saved cameras), each independently testable
- [x] **Technical Stack**: Python 3.11/FastAPI (preferred), Next.js 14 (preferred), ffmpeg ARM64 builds available, all components k3s/Docker compatible

**Violations requiring justification**: None - all constitution principles satisfied

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── api/
│   │   ├── __init__.py
│   │   ├── routes/
│   │   │   ├── __init__.py
│   │   │   ├── camera.py       # Camera connection endpoints
│   │   │   └── health.py       # Health check endpoint
│   │   └── dependencies.py     # FastAPI dependencies
│   ├── models/
│   │   ├── __init__.py
│   │   ├── camera.py          # Camera configuration models
│   │   └── connection.py      # Connection session models
│   ├── services/
│   │   ├── __init__.py
│   │   ├── rtsp_service.py    # RTSP connection handling
│   │   ├── hls_service.py     # HLS transcoding service
│   │   └── ffmpeg_manager.py  # ffmpeg process management
│   ├── core/
│   │   ├── __init__.py
│   │   ├── config.py          # Configuration management
│   │   └── exceptions.py      # Custom exceptions
│   └── main.py                # FastAPI application entry
├── tests/
│   ├── unit/
│   │   ├── test_rtsp_service.py
│   │   └── test_hls_service.py
│   ├── integration/
│   │   └── test_camera_api.py
│   └── conftest.py
├── requirements.txt
├── Dockerfile
└── README.md

frontend/
├── src/
│   ├── app/
│   │   ├── layout.tsx         # Root layout
│   │   ├── page.tsx           # Home/camera connection page
│   │   └── globals.css        # Global styles
│   ├── components/
│   │   ├── CameraForm.tsx     # Camera URL input form
│   │   ├── VideoPlayer.tsx    # HLS video player component
│   │   ├── ConnectionStatus.tsx # Connection state display
│   │   ├── SavedCameras.tsx   # Saved cameras list
│   │   └── ErrorMessage.tsx   # Error display component
│   ├── services/
│   │   ├── api.ts             # Backend API client
│   │   └── storage.ts         # localStorage management
│   ├── types/
│   │   ├── camera.ts          # Camera type definitions
│   │   └── connection.ts      # Connection type definitions
│   └── hooks/
│       ├── useCamera.ts       # Camera connection hook
│       └── useSavedCameras.ts # Saved cameras hook
├── public/
│   └── ...
├── tests/
│   └── components/
│       └── CameraForm.test.tsx
├── package.json
├── tsconfig.json
├── next.config.js
├── Dockerfile
└── README.md

.github/
└── workflows/
    └── ci.yml                 # CI/CD pipeline

k8s/
├── backend-deployment.yaml
├── backend-service.yaml
├── frontend-deployment.yaml
├── frontend-service.yaml
└── ingress.yaml
```

**Structure Decision**: **Web application** (Option 2) - Separate backend and frontend services. Backend handles RTSP connections and HLS transcoding, frontend provides UI. This separation enables independent scaling, clear API boundaries, and follows modern web architecture patterns. Both services deploy as separate containers in k3s.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
