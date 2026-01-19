from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, Dict, Any
from enum import Enum
from uuid import uuid4


class ConnectionStatus(str, Enum):
    IDLE = "idle"
    CONNECTING = "connecting"
    CONNECTED = "connected"
    DISCONNECTED = "disconnected"
    ERROR = "error"
    RECONNECTING = "reconnecting"


class ErrorType(str, Enum):
    INVALID_URL = "invalid_url"
    UNREACHABLE = "unreachable"  
    AUTH_REQUIRED = "auth_required"
    TIMEOUT = "timeout"
    UNSUPPORTED_CODEC = "unsupported_codec"
    CONNECTION_LIMIT = "connection_limit"
    INTERNAL_ERROR = "internal_error"


class StreamMetadata(BaseModel):
    """Stream information from successful RTSP connection"""
    resolution: str = Field(..., description="Video resolution e.g. '1920x1080'")
    codec: str = Field(..., pattern="^(h264|h265)$", description="Video codec (h264 or h265)")
    fps: int = Field(..., ge=1, le=60, description="Frames per second")

    class Config:
        schema_extra = {
            "example": {
                "resolution": "1920x1080",
                "codec": "h264", 
                "fps": 30
            }
        }


class ErrorDetails(BaseModel):
    """Error information for failed connections"""
    type: ErrorType
    message: str
    details: Optional[Dict[str, Any]] = None

    class Config:
        schema_extra = {
            "example": {
                "type": "timeout",
                "message": "Connection timeout. Camera not responding.",
                "details": {"timeout_seconds": 10}
            }
        }


class ConnectionSession(BaseModel):
    """Current RTSP connection state - stored in memory only"""
    camera_url: str
    status: ConnectionStatus = ConnectionStatus.IDLE
    connected_at: Optional[datetime] = None
    error: Optional[ErrorDetails] = None
    stream_metadata: Optional[StreamMetadata] = None
    reconnect_attempts: int = Field(0, ge=0, le=3)
    hls_playlist_url: Optional[str] = None
    session_id: Optional[str] = None

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }
        schema_extra = {
            "example": {
                "camera_url": "rtsp://192.168.1.100:554/stream",
                "status": "connected",
                "connected_at": "2025-12-31T14:30:00Z",
                "stream_metadata": {
                    "resolution": "1920x1080",
                    "codec": "h264",
                    "fps": 30
                },
                "hls_playlist_url": "/api/camera/stream/550e8400-e29b-41d4-a716-446655440000/playlist.m3u8",
                "session_id": "550e8400-e29b-41d4-a716-446655440000"
            }
        }


class Credentials(BaseModel):
    """Session-only credentials - never persisted"""
    username: str
    password: str

    class Config:
        schema_extra = {
            "example": {
                "username": "admin",
                "password": "password123"
            }
        }