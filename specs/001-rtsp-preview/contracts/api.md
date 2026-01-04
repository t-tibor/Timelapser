# API Contracts: RTSP Camera Connection

**Feature**: 001-rtsp-preview  
**Base URL**: `http://localhost:8000/api` (development), `https://timelapser.local/api` (production)  
**Date**: 2025-12-31

---

## Endpoints

### 1. POST /camera/connect

**Purpose**: Initiate connection to RTSP camera and start HLS transcoding

**Request**:
```json
{
  "rtspUrl": "rtsp://192.168.1.100:554/stream",
  "username": "admin",          // optional
  "password": "password123"     // optional
}
```

**Request Schema**:
```typescript
interface ConnectRequest {
  rtspUrl: string;              // Required, must match rtsp:// pattern
  username?: string;            // Optional, for authenticated streams
  password?: string;            // Optional, for authenticated streams
}
```

**Success Response** (200 OK):
```json
{
  "status": "connected",
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "hlsPlaylistUrl": "/api/camera/stream/550e8400-e29b-41d4-a716-446655440000/playlist.m3u8",
  "streamMetadata": {
    "resolution": "1920x1080",
    "codec": "h264",
    "fps": 30
  }
}
```

**Error Responses**:

**400 Bad Request** - Invalid URL format:
```json
{
  "error": {
    "type": "invalid_url",
    "message": "Invalid RTSP URL format. Expected: rtsp://hostname:port/path"
  }
}
```

**401 Unauthorized** - Authentication required:
```json
{
  "error": {
    "type": "auth_required",
    "message": "Authentication required. Please provide username and password."
  }
}
```

**408 Request Timeout** - Connection timeout:
```json
{
  "error": {
    "type": "timeout",
    "message": "Connection timeout. Camera not responding."
  }
}
```

**503 Service Unavailable** - Cannot reach camera:
```json
{
  "error": {
    "type": "unreachable",
    "message": "Cannot reach camera. Check IP address and network connection."
  }
}
```

**415 Unsupported Media Type** - Unsupported codec:
```json
{
  "error": {
    "type": "unsupported_codec",
    "message": "Unsupported video format. Camera must use H.264 or H.265 codec."
  }
}
```

**429 Too Many Requests** - Connection limit reached:
```json
{
  "error": {
    "type": "connection_limit",
    "message": "Connection limit reached. Disconnect current camera before connecting to another."
  }
}
```

---

### 2. POST /camera/disconnect

**Purpose**: Stop HLS transcoding and terminate RTSP connection

**Request**:
```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Request Schema**:
```typescript
interface DisconnectRequest {
  sessionId: string;            // Required, UUID from connect response
}
```

**Success Response** (200 OK):
```json
{
  "status": "disconnected",
  "sessionId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Error Responses**:

**404 Not Found** - Session doesn't exist:
```json
{
  "error": {
    "type": "session_not_found",
    "message": "Session not found or already disconnected."
  }
}
```

---

### 3. GET /camera/stream/{sessionId}/playlist.m3u8

**Purpose**: Serve HLS playlist file for video player

**Path Parameters**:
- `sessionId`: string (UUID) - Active session identifier

**Success Response** (200 OK):
```
Content-Type: application/vnd.apple.mpegurl

#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:2
#EXT-X-MEDIA-SEQUENCE:0
#EXTINF:2.0,
segment_0.ts
#EXTINF:2.0,
segment_1.ts
#EXTINF:2.0,
segment_2.ts
```

**Error Responses**:

**404 Not Found** - Session doesn't exist or expired:
```
Content-Type: application/json

{
  "error": {
    "type": "session_not_found",
    "message": "Stream session not found or expired."
  }
}
```

---

### 4. GET /camera/stream/{sessionId}/{segmentFile}

**Purpose**: Serve HLS video segment file

**Path Parameters**:
- `sessionId`: string (UUID) - Active session identifier
- `segmentFile`: string - Segment filename (e.g., "segment_0.ts")

**Success Response** (200 OK):
```
Content-Type: video/mp2t
Content-Length: [size in bytes]

[Binary video data]
```

**Error Responses**:

**404 Not Found** - Segment doesn't exist:
```
Content-Type: application/json

{
  "error": {
    "type": "segment_not_found",
    "message": "Video segment not found."
  }
}
```

---

### 5. GET /camera/status/{sessionId}

**Purpose**: Check connection status and stream health

**Path Parameters**:
- `sessionId`: string (UUID) - Session identifier

**Success Response** (200 OK):
```json
{
  "status": "connected",
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "connectedAt": "2025-12-31T14:30:00Z",
  "streamMetadata": {
    "resolution": "1920x1080",
    "codec": "h264",
    "fps": 30
  },
  "lastActivity": "2025-12-31T14:35:42Z"
}
```

**Error Responses**:

**404 Not Found** - Session doesn't exist:
```json
{
  "error": {
    "type": "session_not_found",
    "message": "Session not found."
  }
}
```

---

### 6. GET /health

**Purpose**: Health check endpoint for k8s liveness/readiness probes

**Success Response** (200 OK):
```json
{
  "status": "healthy",
  "timestamp": "2025-12-31T14:30:00Z",
  "version": "1.0.0"
}
```

**Error Response** (503 Service Unavailable):
```json
{
  "status": "unhealthy",
  "timestamp": "2025-12-31T14:30:00Z",
  "error": "ffmpeg binary not found"
}
```

---

## Common Headers

### Request Headers
- `Content-Type: application/json` (for POST requests)
- `Accept: application/json`

### Response Headers
- `Content-Type: application/json` (JSON responses)
- `Content-Type: application/vnd.apple.mpegurl` (HLS playlists)
- `Content-Type: video/mp2t` (HLS segments)
- `X-Session-Id: [uuid]` (on successful connect)

---

## Error Response Format

All error responses follow this structure:

```typescript
interface ErrorResponse {
  error: {
    type: string;              // Machine-readable error code
    message: string;           // Human-readable error message
    details?: any;             // Optional additional context
  }
}
```

**Error Types**:
- `invalid_url` - Malformed RTSP URL
- `auth_required` - Authentication credentials needed
- `timeout` - Connection/request timeout
- `unreachable` - Cannot reach camera
- `unsupported_codec` - Video codec not H.264/H.265
- `connection_limit` - Max concurrent connections reached
- `session_not_found` - Invalid or expired session ID
- `segment_not_found` - HLS segment file missing
- `internal_error` - Server-side error

---

## Rate Limiting

**Connection Requests**: 10 per minute per IP
**Stream Requests**: No limit (required for smooth playback)
**Disconnect Requests**: 20 per minute per IP

**Rate Limit Headers**:
- `X-RateLimit-Limit: 10`
- `X-RateLimit-Remaining: 7`
- `X-RateLimit-Reset: 1704034260`

**Rate Limit Exceeded** (429 Too Many Requests):
```json
{
  "error": {
    "type": "rate_limit_exceeded",
    "message": "Too many requests. Please try again in 42 seconds."
  }
}
```

---

## Authentication

**Current Implementation**: None (single-user hobby project)

**Future Consideration**: Bearer token authentication for multi-user support

---

## CORS Configuration

**Allowed Origins**: 
- `http://localhost:3000` (development)
- `https://timelapser.local` (production)

**Allowed Methods**: `GET, POST, OPTIONS`

**Allowed Headers**: `Content-Type, Accept, Authorization`

---

## WebSocket (Future Enhancement)

**Endpoint**: `ws://localhost:8000/ws/camera/{sessionId}`

**Purpose**: Real-time connection status updates

**Status**: Not implemented in Phase 1 (polling via /camera/status endpoint instead)

---

## Example Usage

### Connect to Camera

```bash
curl -X POST http://localhost:8000/api/camera/connect \
  -H "Content-Type: application/json" \
  -d '{
    "rtspUrl": "rtsp://192.168.1.100:554/stream",
    "username": "admin",
    "password": "secret"
  }'
```

### Play Stream in Browser

```javascript
const video = document.getElementById('video');
const hls = new Hls();
hls.loadSource('/api/camera/stream/550e8400-e29b-41d4-a716-446655440000/playlist.m3u8');
hls.attachMedia(video);
```

### Disconnect

```bash
curl -X POST http://localhost:8000/api/camera/disconnect \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "550e8400-e29b-41d4-a716-446655440000"
  }'
```

---

## Notes

- HLS segments auto-delete after serving (ffmpeg `-hls_flags delete_segments`)
- Session IDs expire after 1 hour of inactivity
- Maximum 1 concurrent connection enforced per constitution
- Credentials never logged or persisted
- All timestamps in ISO 8601 format (UTC)