# Data Model: RTSP Camera Connection and Video Preview

**Feature**: 001-rtsp-preview  
**Date**: 2025-12-31  
**Status**: Complete

## Overview

Data model for managing RTSP camera connections, saved camera configurations, and connection sessions. Emphasizes simplicity with minimal persistence (localStorage for saved cameras, in-memory for credentials).

---

## Entities

### 1. Camera Configuration

**Purpose**: Represents a saved RTSP camera setup that users can quickly reconnect to

**Attributes**:
- `id`: string (UUID) - Unique identifier for saved camera
- `name`: string (max 50 chars) - User-friendly display name
- `rtspUrl`: string - Full RTSP URL (rtsp://hostname:port/path)
- `createdAt`: ISO 8601 timestamp - When camera was first saved
- `lastUsedAt`: ISO 8601 timestamp - Last successful connection time
- `requiresAuth`: boolean - Whether camera requires username/password

**Validation Rules**:
- Maximum 5 camera configurations per user
- `name` must be unique within user's saved cameras
- `rtspUrl` must match pattern: `rtsp://[hostname]:[port]/[path]` (port and path optional)
- `name` cannot be empty string

**Persistence**: Browser localStorage (key: `timelapse_saved_cameras`)

**Lifecycle**:
- Created when user clicks "Save Camera" after successful connection
- Updated (lastUsedAt) when user connects to saved camera
- Deleted when user removes camera from saved list

**Relationships**: None (standalone entity)

**Security Considerations**:
- Credentials (username/password) are **NOT** stored in Camera Configuration
- Only URL and metadata persisted
- No sensitive data in localStorage

---

### 2. Connection Session

**Purpose**: Represents an active or recent RTSP connection state

**Attributes**:
- `cameraUrl`: string - RTSP URL being connected to
- `status`: enum - Current connection state
  - `idle`: No connection
  - `connecting`: Connection attempt in progress
  - `connected`: Successfully connected, stream playing
  - `disconnected`: Intentionally disconnected by user
  - `error`: Connection failed or interrupted
  - `reconnecting`: Auto-reconnection in progress
- `connectedAt`: ISO 8601 timestamp or null - When connection established
- `error`: object or null - Error details if status=error
  - `type`: enum (`invalid_url`, `unreachable`, `auth_required`, `timeout`, `unsupported_codec`)
  - `message`: string - User-friendly error message
- `streamMetadata`: object or null - Stream info when connected
  - `resolution`: string (e.g., "1920x1080")
  - `codec`: enum (`h264`, `h265`)
  - `fps`: number - Frames per second
- `credentials`: object or null - Session-only auth data (in-memory only)
  - `username`: string
  - `password`: string
- `reconnectAttempts`: number - Current reconnection attempt count (0-3)
- `hlsPlaylistUrl`: string or null - URL to HLS m3u8 playlist when connected

**Validation Rules**:
- Only one Connection Session active at a time (single concurrent connection)
- `status` transitions follow state machine:
  - idle → connecting → (connected | error)
  - connected → (disconnected | reconnecting | error)
  - reconnecting → (connected | error) (after 3 attempts)
  - error → idle (after user acknowledgment)
- `reconnectAttempts` max value: 3

**Persistence**: None - exists only in application memory (React state/backend memory)

**Lifecycle**:
- Created when user initiates connection
- Updated as connection progresses through states
- Cleared when connection is terminated or user navigates away

**Relationships**: 
- May reference a Camera Configuration (if connecting to saved camera)
- Ephemeral - not persisted across page refreshes

**Security Considerations**:
- Credentials stored **only in memory** (never persisted)
- Cleared on page refresh or browser close
- Not logged or transmitted except to backend API (HTTPS only)

---

### 3. HLS Stream Session (Backend Only)

**Purpose**: Backend tracking of active ffmpeg transcoding processes

**Attributes**:
- `sessionId`: string (UUID) - Unique session identifier
- `rtspUrl`: string - Source RTSP URL
- `ffmpegProcess`: Process handle - Running ffmpeg subprocess
- `hlsOutputDir`: string - Temporary directory for HLS segments
- `playlistPath`: string - Path to m3u8 playlist file
- `createdAt`: timestamp - When transcoding started
- `lastActivity`: timestamp - Last segment write time
- `status`: enum (`starting`, `active`, `stopping`, `stopped`)

**Validation Rules**:
- One HLS Stream Session per Connection Session
- Cleanup required when session ends (kill ffmpeg, delete temp files)

**Persistence**: None - in-memory tracking only

**Lifecycle**:
- Created when backend starts transcoding for new connection
- Active while streaming
- Destroyed when connection ends (cleanup ffmpeg + temp files)

**Relationships**: 
- One-to-one with Connection Session
- Parent-child relationship with ffmpeg subprocess

**Resource Management**:
- Temp directory cleanup on session end
- Process termination on disconnect
- Max age: connection timeout + grace period

---

## Data Flow

### Connect to Camera Flow

```
1. User enters RTSP URL in frontend
2. Frontend validates URL format
3. Frontend creates Connection Session (status: connecting)
4. Frontend POSTs to /api/camera/connect with URL + credentials
5. Backend validates and creates HLS Stream Session
6. Backend spawns ffmpeg subprocess for transcoding
7. Backend returns HLS playlist URL
8. Frontend updates Connection Session (status: connected, hlsPlaylistUrl)
9. Frontend initializes video player with HLS URL
10. Video player starts playback
```

### Save Camera Flow

```
1. User clicks "Save Camera" while connected
2. Frontend checks saved camera count (<5)
3. Frontend prompts for friendly name
4. Frontend creates Camera Configuration object
5. Frontend saves to localStorage (key: timelapse_saved_cameras)
6. Frontend updates saved cameras list UI
```

### Reconnect Flow (Network Failure)

```
1. Video player detects playback stall/error
2. Frontend updates Connection Session (status: reconnecting, reconnectAttempts: 1)
3. Frontend waits 2 seconds (exponential backoff)
4. Frontend POSTs to /api/camera/connect again
5. If success: Connection Session (status: connected, reconnectAttempts: 0)
6. If failure: reconnectAttempts++, wait 4s, retry
7. After 3 failures: Connection Session (status: error)
```

---

## Storage Strategy

### localStorage Schema

**Key**: `timelapse_saved_cameras`

**Value** (JSON array):
```json
[
  {
    "id": "uuid-v4",
    "name": "Front Door Camera",
    "rtspUrl": "rtsp://192.168.1.100:554/stream",
    "createdAt": "2025-12-31T14:30:00Z",
    "lastUsedAt": "2025-12-31T15:45:00Z",
    "requiresAuth": true
  },
  ...
]
```

**Max Size**: ~2KB per camera × 5 cameras = ~10KB total (well within localStorage limits)

### In-Memory State (Frontend)

**React State**:
```typescript
interface AppState {
  currentConnection: ConnectionSession | null;
  savedCameras: CameraConfiguration[];
  sessionCredentials: Map<string, {username: string, password: string}>; // keyed by camera URL
}
```

### Backend State

**Python Dictionary**:
```python
active_sessions: Dict[str, HLSStreamSession] = {}  # keyed by session_id
```

---

## Validation & Constraints

### Frontend Validations

- RTSP URL format: `^rtsp://[\w\.\-]+(?::\d{1,5})?(?:/[\w\-\./]*)?$`
- Camera name length: 1-50 characters
- Max saved cameras: 5
- Single concurrent connection enforced

### Backend Validations

- RTSP URL reachability check (10s timeout)
- H.264/H.265 codec verification (from ffmpeg probe)
- ffmpeg process health monitoring

---

## Security Model

### Credential Handling

**Storage Rules**:
- ✅ RTSP URLs (without credentials embedded): Persist in localStorage
- ❌ Usernames/passwords: **Never persisted**, memory-only
- ❌ Credentials in logs: **Never logged**

**Session Flow**:
1. User enters credentials when connecting
2. Frontend stores in memory (`sessionCredentials` Map)
3. Frontend passes to backend API via HTTPS
4. Backend uses for RTSP connection, doesn't persist
5. Frontend reuses from memory for reconnections during session
6. Cleared on page refresh

**Why Session-Only**:
- Avoids complexity of encryption key management
- Aligns with Pragmatic Simplicity principle
- Acceptable trade-off for hobby project (user re-enters occasionally)

---

## Error States

### Connection Error Types

| Error Type | User Message | Recovery Action |
|------------|--------------|-----------------|
| `invalid_url` | "Invalid RTSP URL format. Expected: rtsp://hostname:port/path" | User corrects URL |
| `unreachable` | "Cannot reach camera. Check IP address and network connection." | Check network/URL |
| `auth_required` | "Authentication required. Please provide username and password." | User enters credentials |
| `timeout` | "Connection timeout. Camera not responding." | Retry or check camera |
| `unsupported_codec` | "Unsupported video format. Camera must use H.264 or H.265 codec." | User checks camera settings |

---

## Performance Considerations

### localStorage Limits

- Typical limit: 5-10MB per origin
- Our usage: ~10KB (well within limits)
- No pagination needed for 5 cameras

### Memory Usage

- Connection Session: ~1KB in memory
- Credentials: ~200 bytes per camera
- HLS metadata: ~500 bytes
- Total per connection: ~2KB (negligible)

### Cleanup Strategy

- Clear disconnected sessions from memory
- ffmpeg temp files: Delete on session end
- HLS segments: Auto-delete by ffmpeg (`-hls_flags delete_segments`)
- stale segment cleanup: 1-hour max age

---

## Future Considerations (Out of Scope)

- Database persistence for multi-user support
- Camera thumbnails/snapshots
- Connection history/analytics
- Cloud credential storage with encryption

**Current Scope**: Single-user, session-based, minimal persistence per constitution principles.