# Quickstart Guide: RTSP Camera Connection

**Feature**: 001-rtsp-preview  
**For**: Developers implementing this feature  
**Date**: 2025-12-31

---

## Prerequisites

- Docker installed
- k3s cluster running (or Docker Compose for local development)
- RTSP camera accessible on network (or test stream)
- Python 3.11+, Node.js 20+ (for local development without containers)

---

## Local Development Setup

### 1. Backend Setup

```bash
cd backend

# Create virtual environment
python3.11 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Install ffmpeg (if not already installed)
# Ubuntu/Debian:
sudo apt-get install ffmpeg
# macOS:
brew install ffmpeg
# Windows: Download from https://ffmpeg.org/download.html

# Create .env file
cat > .env << EOF
HOST=0.0.0.0
PORT=8000
HLS_OUTPUT_DIR=/tmp/hls
LOG_LEVEL=INFO
EOF

# Run backend
uvicorn src.main:app --reload --host 0.0.0.0 --port 8000
```

**Backend will be available at**: `http://localhost:8000`  
**API docs**: `http://localhost:8000/docs` (FastAPI auto-generated)

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Create .env.local file
cat > .env.local << EOF
NEXT_PUBLIC_API_URL=http://localhost:8000/api
EOF

# Run frontend
npm run dev
```

**Frontend will be available at**: `http://localhost:3000`

### 3. Test RTSP Connection

**Option A**: Use Real Camera
```bash
# Test connection to your camera
curl -X POST http://localhost:8000/api/camera/connect \
  -H "Content-Type: application/json" \
  -d '{
    "rtspUrl": "rtsp://192.168.1.100:554/stream",
    "username": "admin",
    "password": "yourpassword"
  }'
```

**Option B**: Use Test Stream (Big Buck Bunny)
```bash
# Public test stream (no auth required)
curl -X POST http://localhost:8000/api/camera/connect \
  -H "Content-Type: application/json" \
  -d '{
    "rtspUrl": "rtsp://wowzaec2demo.streamlock.net/vod/mp4:BigBuckBunny_115k.mp4"
  }'
```

**Option C**: Run Local RTSP Test Server
```bash
# Install mediamtx (lightweight RTSP server)
docker run --rm -it -p 8554:8554 bluenviron/mediamtx:latest

# In another terminal, publish test video
ffmpeg -re -stream_loop -1 -i sample.mp4 -c copy -f rtsp rtsp://localhost:8554/test

# Connect to test stream
curl -X POST http://localhost:8000/api/camera/connect \
  -H "Content-Type: application/json" \
  -d '{"rtspUrl": "rtsp://localhost:8554/test"}'
```

---

## Docker Development

### Build Images

```bash
# Backend
cd backend
docker build -t timelapser-backend:dev .

# Frontend
cd frontend
docker build -t timelapser-frontend:dev .
```

### Run with Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  backend:
    image: timelapser-backend:dev
    ports:
      - "8000:8000"
    environment:
      - HOST=0.0.0.0
      - PORT=8000
      - HLS_OUTPUT_DIR=/tmp/hls
    volumes:
      - /tmp/hls:/tmp/hls
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  frontend:
    image: timelapser-frontend:dev
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:8000/api
    depends_on:
      - backend
```

```bash
docker-compose up
```

---

## k3s Deployment

### 1. Apply Kubernetes Manifests

```bash
# Create namespace
kubectl create namespace timelapser

# Deploy backend
kubectl apply -f k8s/backend-deployment.yaml
kubectl apply -f k8s/backend-service.yaml

# Deploy frontend
kubectl apply -f k8s/frontend-deployment.yaml
kubectl apply -f k8s/frontend-service.yaml

# Configure ingress
kubectl apply -f k8s/ingress.yaml
```

### 2. Verify Deployment

```bash
# Check pods
kubectl get pods -n timelapser

# Check services
kubectl get svc -n timelapser

# Check logs
kubectl logs -f deployment/timelapser-backend -n timelapser
kubectl logs -f deployment/timelapser-frontend -n timelapser
```

### 3. Access Application

```bash
# Get ingress address
kubectl get ingress -n timelapser

# Add to /etc/hosts (or equivalent)
# [INGRESS_IP] timelapser.local

# Access at: https://timelapser.local
```

---

## Architecture Diagram

```
┌─────────────────┐
│   Web Browser   │
│  (Next.js App)  │
└────────┬────────┘
         │
         │ HTTPS
         ▼
┌─────────────────┐
│  Frontend Pod   │
│   (Next.js)     │
│   Port: 3000    │
└────────┬────────┘
         │
         │ HTTP API
         ▼
┌─────────────────┐      ┌──────────────┐
│  Backend Pod    │─────▶│ RTSP Camera  │
│  (FastAPI)      │ RTSP │  (External)  │
│   Port: 8000    │      └──────────────┘
└────────┬────────┘
         │
         │ spawn
         ▼
    ┌─────────┐
    │ ffmpeg  │
    │ process │
    └─────────┘
         │
         │ writes
         ▼
    ┌──────────────┐
    │ HLS Segments │
    │  (.m3u8/.ts) │
    └──────────────┘
```

---

## Development Workflow

### 1. Make Code Changes

**Backend** (with hot reload):
```bash
cd backend
# Code changes auto-reload with uvicorn --reload
```

**Frontend** (with hot reload):
```bash
cd frontend
# Code changes auto-reload with next dev
```

### 2. Run Tests

**Backend**:
```bash
cd backend
pytest tests/ -v
```

**Frontend**:
```bash
cd frontend
npm test
```

### 3. Check API Documentation

FastAPI auto-generates interactive API docs:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

---

## Common Development Tasks

### Test HLS Stream Directly

```bash
# Start connection
SESSION_ID=$(curl -s -X POST http://localhost:8000/api/camera/connect \
  -H "Content-Type: application/json" \
  -d '{"rtspUrl": "rtsp://camera/stream"}' | jq -r '.sessionId')

# Get playlist URL
PLAYLIST_URL="http://localhost:8000/api/camera/stream/${SESSION_ID}/playlist.m3u8"

# Test with ffplay
ffplay "$PLAYLIST_URL"

# Or use VLC
vlc "$PLAYLIST_URL"
```

### Monitor ffmpeg Processes

```bash
# List active ffmpeg processes
ps aux | grep ffmpeg

# Monitor CPU usage
htop -p $(pgrep ffmpeg)

# Check HLS output
ls -lah /tmp/hls/
```

### Debug Connection Issues

```bash
# Test RTSP URL directly
ffprobe -rtsp_transport tcp rtsp://camera/stream

# Check codec
ffprobe -v error -select_streams v:0 -show_entries stream=codec_name \
  -of default=noprint_wrappers=1:nokey=1 rtsp://camera/stream

# Test network connectivity
nc -zv 192.168.1.100 554
```

---

## Troubleshooting

### Issue: "Connection timeout"

**Causes**:
- Camera not reachable
- Wrong IP address
- Firewall blocking RTSP port (554)

**Solutions**:
```bash
# Test connectivity
ping 192.168.1.100
telnet 192.168.1.100 554

# Check firewall
sudo ufw status
```

### Issue: "Unsupported codec"

**Causes**:
- Camera using MJPEG, VP8, or other non-H.264/H.265 codec

**Solutions**:
```bash
# Check camera codec
ffprobe rtsp://camera/stream

# Reconfigure camera to use H.264 (check camera admin panel)
```

### Issue: "Video stuttering/buffering"

**Causes**:
- High CPU usage
- Network bandwidth insufficient
- HLS segment duration too long

**Solutions**:
```bash
# Enable hardware acceleration (Raspberry Pi)
# Edit ffmpeg command in backend to use h264_v4l2m2m codec

# Reduce segment duration (in ffmpeg command)
-hls_time 1  # (currently 2 seconds)

# Check CPU usage
top -p $(pgrep ffmpeg)
```

### Issue: "Cannot save more than 5 cameras"

**Cause**:
- Maximum limit reached (per constitution)

**Solution**:
```javascript
// Delete unused camera in frontend
localStorage.removeItem('timelapse_saved_cameras');
// Or delete specific camera via UI
```

---

## Environment Variables

### Backend (.env)

```bash
HOST=0.0.0.0                    # Server host
PORT=8000                        # Server port
HLS_OUTPUT_DIR=/tmp/hls          # Temp directory for HLS segments
HLS_SEGMENT_DURATION=2           # Segment duration in seconds
HLS_PLAYLIST_SIZE=3              # Number of segments in playlist
CONNECTION_TIMEOUT=10            # RTSP connection timeout (seconds)
MAX_RECONNECT_ATTEMPTS=3         # Auto-reconnection retry limit
LOG_LEVEL=INFO                   # Logging level
```

### Frontend (.env.local)

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000/api  # Backend API URL
```

---

## Performance Tuning (Raspberry Pi 5)

### Enable Hardware Acceleration

```bash
# Check available codecs
ffmpeg -codecs | grep h264

# Use V4L2 hardware codec in ffmpeg command
ffmpeg -hwaccel auto -i rtsp://camera/stream \
  -c:v h264_v4l2m2m -f hls output.m3u8
```

### Optimize HLS Settings

```bash
# Lower latency (smaller segments)
-hls_time 1 -hls_list_size 2

# Reduce memory usage
-hls_flags delete_segments+temp_file
```

### Monitor Resource Usage

```bash
# CPU/Memory
docker stats

# Or in k8s
kubectl top pods -n timelapser
```

---

## Next Steps

1. **Implement User Stories P1**: Connect to camera (core functionality)
2. **Implement User Stories P2**: Error handling
3. **Implement User Stories P3**: Saved cameras
4. **Write Tests**: Unit + integration tests
5. **Deploy to k3s**: Apply manifests and verify
6. **Iterate**: Based on real camera testing

---

## Resources

- **FastAPI Docs**: https://fastapi.tiangolo.com/
- **Next.js Docs**: https://nextjs.org/docs
- **ffmpeg HLS Guide**: https://trac.ffmpeg.org/wiki/StreamingGuide
- **hls.js**: https://github.com/video-dev/hls.js/
- **Video.js**: https://videojs.com/
- **RTSP Protocol**: https://datatracker.ietf.org/doc/html/rfc2326

---

## Support

For issues or questions:
1. Check [research.md](research.md) for technical decisions
2. Review [data-model.md](data-model.md) for entity details
3. Consult [contracts/api.md](contracts/api.md) for API reference
4. See [spec.md](spec.md) for requirements

---

**Status**: Ready for implementation  
**Estimated Time**: 25-35 hours (per research.md)  
**Complexity**: Simple (hobby project appropriate)