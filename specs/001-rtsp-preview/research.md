# Research: RTSP Camera Connection and Video Preview

**Feature**: 001-rtsp-preview  
**Date**: 2025-12-31  
**Status**: Complete

## Overview

Research conducted to determine optimal technology stack for implementing RTSP camera video streaming in a web browser for a hobby timelapse project deployed on Raspberry Pi 5 (ARM64).

## 1. RTSP to Browser Streaming Problem

### Decision
**HLS (HTTP Live Streaming) transcoding approach**

### Rationale
- Browsers don't natively support RTSP protocol
- HLS is widely supported across all modern browsers without plugins
- Simpler architecture than WebRTC for one-way video streaming
- Well-suited for ARM64 devices with hardware acceleration support
- Meets 5-second connection target with 2-second segments
- Lower latency than traditional HLS (~3-4 seconds achievable)

### Alternatives Considered
- **WebRTC**: Lower latency (~1-2s) but significantly more complex, requires TURN/STUN servers, overkill for one-way streaming
- **DASH**: Similar to HLS but less browser support, no advantage for this use case
- **WebSocket + MSE**: Complex implementation requiring manual codec handling, no significant benefit
- **ffmpeg.wasm**: Client-side decoding too heavy for Raspberry Pi clients, high CPU usage

### Trade-offs
**Pros:**
- Simple, reliable implementation
- Browser-native support (no plugins)
- Stateless HTTP serving
- Easy to deploy and debug
- Works behind firewalls/NATs

**Cons:**
- 3-5 second latency (acceptable for timelapse preview use case)
- Requires server-side transcoding (CPU/memory cost)

### ARM64 Compatibility
✅ **Excellent** - ffmpeg has mature ARM64 builds with hardware acceleration support (V4L2, OMX codecs)

### Complexity Assessment
**Simple** - Standard HTTP file serving, well-documented tooling, extensive community support

---

## 2. Backend Framework Selection

### Decision
**Python 3.11+ with FastAPI**

### Rationale
- Lightweight and modern, perfect for hobby projects
- Excellent async support for handling video streams
- Superior Python libraries for video processing (opencv-python, ffmpeg-python)
- Simpler deployment (single Python container vs .NET runtime)
- Better RTSP library ecosystem (aiortsp, python-vlc)
- Native async/await for concurrent camera handling
- Automatic OpenAPI documentation for API endpoints
- Faster development with minimal boilerplate

### Alternatives Considered
- **.NET (ASP.NET Core)**: Excellent performance but fewer mature RTSP libraries, heavier runtime footprint on ARM64, more complex setup for hobby project

### Trade-offs
**Pros:**
- Rapid development cycle
- Rich ecosystem of video processing libraries
- Minimal configuration required
- Great for prototyping and iteration
- Lower memory footprint

**Cons:**
- Slightly slower raw performance than .NET (negligible for this use case)
- GIL limitations (not relevant for subprocess-based ffmpeg approach)

### ARM64 Compatibility
✅ **Excellent** - Python 3.11+ has official ARM64 builds, all major libraries (FastAPI, uvicorn, opencv) fully supported

### Complexity Assessment
**Simple** - Minimal setup, clear patterns, fast iteration

---

## 3. Frontend Framework Selection

### Decision
**Next.js 14+ with TypeScript**

### Rationale
- Integrated full-stack framework (can serve API routes if needed in future)
- Built-in optimizations (Image, Script components for performance)
- Server-side rendering for better initial page load
- Built on React ecosystem (familiar, large community)
- Simpler project structure than separate React SPA + backend coordination
- Excellent video player library support (video.js, hls.js)
- TypeScript support built-in for type safety

### Alternatives Considered
- **React (Vite)**: Good for pure SPA but requires separate backend coordination, more configuration, no built-in API routes

### Trade-offs
**Pros:**
- All-in-one solution (routing, API routes, optimization)
- Great developer experience
- Built-in TypeScript support
- Convention over configuration
- Excellent documentation

**Cons:**
- Slightly more opinionated than plain React
- Larger Docker image (can be optimized with standalone builds)

### ARM64 Compatibility
✅ **Excellent** - Node.js has official ARM64 builds, Next.js fully supported

### Complexity Assessment
**Simple** - Convention over configuration, clear documentation, gentle learning curve

---

## 4. Recommended Architecture

### System Design

```
RTSP Camera → Python (FastAPI) → ffmpeg transcoding → HLS segments (.m3u8 + .ts) → 
Static file serving → Next.js frontend → hls.js player → Browser
```

### Components

#### **Backend (Python + FastAPI)**
- Manages RTSP connections with authentication
- Spawns ffmpeg processes for HLS transcoding
- Serves HLS segments (.m3u8 playlists + .ts video segments)
- Provides REST API for camera management
- Health checks and camera status monitoring

#### **Frontend (Next.js + TypeScript)**
- Video player using Video.js + hls.js
- Camera connection UI (URL input, connect/disconnect)
- Saved camera selection interface
- Real-time connection status display
- Consumes FastAPI REST endpoints

### Rationale
Clear separation of concerns, independently scalable components, both can be containerized separately for k3s deployment

---

## 5. Technology Stack & Libraries

### Backend Libraries

**RTSP Client:**
- **aiortsp**: Async RTSP client, lightweight, pure Python (recommended for async operations)
- **opencv-python**: Mature library, hardware acceleration support, handles RTSP authentication
- **ffmpeg-python**: Python wrapper for ffmpeg CLI (simplest option for transcoding)

**HLS Generation:**
- **ffmpeg**: Industry standard video transcoding tool
- ARM64 builds available with hardware acceleration (V4L2, OMX)
- Example command: `ffmpeg -rtsp_transport tcp -i rtsp://user:pass@camera/stream -c:v copy -f hls -hls_time 2 -hls_list_size 3 -hls_flags delete_segments output.m3u8`

**Web Framework:**
- **FastAPI 0.104+**: Modern async framework
- **uvicorn**: ASGI server with ARM64 support
- **python-dotenv**: Environment configuration

### Frontend Libraries

**Video Players:**
- **hls.js** (recommended): Pure JavaScript HLS player, most popular, excellent browser support
- **Video.js**: Feature-rich HTML5 player with extensive UI controls
- Optional: **Plyr** as lightweight alternative

**React/Next.js Components:**
- **react-player**: Simple wrapper supporting HLS URLs
- Custom Video.js React component wrapper

### Key Dependencies

**Backend:**
```
fastapi>=0.104.0
uvicorn[standard]>=0.24.0
ffmpeg-python>=0.2.0
python-dotenv>=1.0.0
aiofiles>=23.0.0
```

**Frontend:**
```
next@14
react@18
hls.js@latest
video.js@latest
@types/video.js
typescript@5
```

---

## 6. Performance & Hardware Optimization

### Raspberry Pi 5 Hardware Acceleration

**Decision:** Use h264_v4l2m2m codec for hardware encoding

**Commands:**
```bash
ffmpeg -hwaccel auto -i rtsp://camera/stream -c:v h264_v4l2m2m -f hls output.m3u8
```

**Impact:**
- Reduces CPU usage from ~80% to ~20% for 1080p transcoding
- Enables smooth handling of multiple camera streams
- Critical for resource-constrained environment

### Connection Time Optimization

**Settings:**
- Use `-rtsp_transport tcp` (more reliable than UDP)
- Set `-fflags nobuffer -flags low_delay` for faster startup
- HLS segment duration: 2 seconds (balances latency vs overhead)
- Target: 3-4 second connection time (within 5-second requirement)

### Scaling Considerations

- FastAPI can handle 5-10 concurrent camera streams on Raspberry Pi 5
- Use process-per-camera model (subprocess ffmpeg instances)
- Optional: Nginx reverse proxy for static HLS segment serving (offload from Python)
- Implement connection limits per constitution (single concurrent connection for this feature)

---

## 7. Implementation Complexity

| Component | Complexity | Estimated Dev Time |
|-----------|------------|-------------------|
| FastAPI RTSP endpoint | Simple | 4-6 hours |
| ffmpeg HLS transcoding | Simple | 2-4 hours |
| HLS segment serving | Simple | 2-3 hours |
| Next.js video player | Simple | 3-5 hours |
| Authentication handling | Simple | 2-3 hours |
| Saved cameras (localStorage) | Simple | 2-3 hours |
| Error handling & reconnection | Simple | 3-4 hours |
| Docker containerization | Simple | 3-4 hours |
| k3s deployment manifests | Medium | 4-6 hours |
| **Total** | **Simple** | **25-35 hours** |

**Alignment with Constitution:** Pragmatically simple, suitable for weekend hobby project development

---

## 8. Docker & Kubernetes Deployment

### Backend Dockerfile

```dockerfile
FROM python:3.11-slim-bookworm  # Official ARM64 support
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Frontend Dockerfile

```dockerfile
FROM node:20-alpine  # Official ARM64 support
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
CMD ["npm", "start"]
```

### k3s Considerations

- Use NodePort or LoadBalancer service for frontend
- Backend as ClusterIP service (internal only)
- Persistent volume for HLS segments (ephemeral, can use emptyDir)
- Resource limits: 1GB RAM backend, 512MB frontend
- Health checks on both containers

---

## 9. Alternative Approach (Not Recommended)

### Python + Streamlit (All-Python)

**When to Consider:**
- Rapid prototyping only
- Single-user application
- Minimal UI requirements

**Trade-offs:**
- ✅ Single language, faster initial development
- ❌ Less polished UI, limited customization, harder to scale to production

**Decision:** Not recommended for this project - Next.js provides better UX and maintainability

---

## 10. Final Technology Stack

### Recommendation

```
Frontend:  Next.js 14 + TypeScript + hls.js + Video.js
Backend:   Python 3.11 + FastAPI + uvicorn + ffmpeg
Streaming: ffmpeg with HLS transcoding (h264_v4l2m2m hardware codec)
Deployment: Docker multi-arch containers on k3s (Raspberry Pi 5 ARM64)
Storage:   localStorage for saved cameras (frontend)
```

### Requirements Validation

| Requirement | Solution | Status |
|-------------|----------|--------|
| RTSP to browser streaming | HLS transcoding via ffmpeg | ✅ |
| H.264/H.265 codec support | ffmpeg native support | ✅ |
| 5-second connection target | ~3-4s achievable with optimization | ✅ |
| Authentication handling | RTSP URL with credentials | ✅ |
| 1080p@30fps smooth playback | Hardware acceleration on RPi5 | ✅ |
| ARM64 compatible | All components have ARM64 builds | ✅ |
| Docker + k3s deployment | Official images available | ✅ |
| Pragmatically simple | 25-35 hours, hobby-friendly | ✅ |
| Single concurrent connection | Enforced in backend logic | ✅ |
| Session-only credentials | Frontend memory storage | ✅ |
| 5 saved cameras max | localStorage limit check | ✅ |

---

## 11. Risks & Mitigations

### Risk: ffmpeg CPU overload on RPi5

**Mitigation:** 
- Use hardware acceleration (h264_v4l2m2m)
- Enforce single connection limit
- Implement CPU monitoring and throttling

### Risk: Network latency affecting connection time

**Mitigation:**
- Use TCP transport for reliability
- Implement connection timeout (10s from spec)
- Show loading indicators immediately

### Risk: HLS latency too high

**Mitigation:**
- 2-second segments (acceptable for preview use case)
- Document latency expectations
- Future: Consider WebRTC for low-latency needs

---

## Conclusion

The **HLS transcoding approach with Python/FastAPI backend and Next.js/TypeScript frontend** provides the optimal balance of:

1. **Simplicity** - Straightforward implementation, well-documented
2. **Performance** - Hardware acceleration on ARM64, efficient resource usage
3. **Reliability** - Mature technologies, extensive community support
4. **Maintainability** - Clean separation of concerns, type-safe frontend
5. **Alignment** - Meets all requirements and constitution principles

This research resolves all NEEDS CLARIFICATION items for Phase 0 and provides clear technical direction for Phase 1 implementation planning.
