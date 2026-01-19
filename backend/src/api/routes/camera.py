from fastapi import APIRouter, HTTPException, status
from fastapi.responses import FileResponse, Response
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
import logging

from src.models.connection import StreamMetadata, ErrorDetails, ErrorType
from src.services.hls_service import HLSService
from src.core.exceptions import (
    ValidationError,
    AuthenticationError,
    TimeoutError,
    RTSPConnectionError,
    UnsupportedCodecError,
    ConnectionLimitError,
    SessionNotFoundError
)
from src.core.config import settings

logger = logging.getLogger(__name__)
router = APIRouter()

# Global HLS service instance
hls_service = HLSService()


# Request/Response Models
class ConnectRequest(BaseModel):
    rtsp_url: str = Field(..., alias="rtspUrl")
    username: Optional[str] = None
    password: Optional[str] = None
    
    class Config:
        populate_by_name = True


class ConnectResponse(BaseModel):
    status: str
    session_id: str = Field(..., alias="sessionId")
    hls_playlist_url: str = Field(..., alias="hlsPlaylistUrl")
    stream_metadata: StreamMetadata = Field(..., alias="streamMetadata")
    
    class Config:
        populate_by_name = True


class DisconnectRequest(BaseModel):
    session_id: str = Field(..., alias="sessionId")
    
    class Config:
        populate_by_name = True


class DisconnectResponse(BaseModel):
    status: str
    session_id: str = Field(..., alias="sessionId")
    
    class Config:
        populate_by_name = True


class ErrorResponse(BaseModel):
    error: ErrorDetails


class StatusResponse(BaseModel):
    status: str
    session_id: str = Field(..., alias="sessionId")
    connected_at: str = Field(..., alias="connectedAt")
    stream_metadata: StreamMetadata = Field(..., alias="streamMetadata")
    last_activity: str = Field(..., alias="lastActivity")
    
    class Config:
        populate_by_name = True


# Endpoints
@router.post("/camera/connect", response_model=ConnectResponse, status_code=status.HTTP_200_OK)
async def connect_camera(request: ConnectRequest):
    """Connect to RTSP camera and start HLS transcoding"""
    
    logger.info(f"Received connect request for {request.rtsp_url}")
    
    try:
        # Check connection limit
        if hls_service.get_active_session_count() >= settings.max_concurrent_connections:
            raise ConnectionLimitError(
                "Connection limit reached. Disconnect current camera before connecting to another."
            )
        
        # Create HLS session
        session = await hls_service.create_session(
            rtsp_url=request.rtsp_url,
            username=request.username,
            password=request.password
        )
        
        logger.info(f"Successfully created session {session.session_id}")
        
        return ConnectResponse(
            status="connected",
            session_id=session.session_id,
            hls_playlist_url=session.get_playlist_url(),
            stream_metadata=session.stream_metadata
        )
        
    except ValidationError as e:
        logger.warning(f"Validation error: {e.message}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": {
                    "type": ErrorType.INVALID_URL.value,
                    "message": e.message
                }
            }
        )
        
    except AuthenticationError as e:
        logger.warning(f"Authentication error: {e.message}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "error": {
                    "type": ErrorType.AUTH_REQUIRED.value,
                    "message": e.message
                }
            }
        )
        
    except TimeoutError as e:
        logger.error(f"Timeout error: {e.message}")
        raise HTTPException(
            status_code=status.HTTP_408_REQUEST_TIMEOUT,
            detail={
                "error": {
                    "type": ErrorType.TIMEOUT.value,
                    "message": e.message
                }
            }
        )
        
    except UnsupportedCodecError as e:
        logger.warning(f"Unsupported codec: {e.message}")
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail={
                "error": {
                    "type": ErrorType.UNSUPPORTED_CODEC.value,
                    "message": e.message
                }
            }
        )
        
    except ConnectionLimitError as e:
        logger.warning(f"Connection limit reached: {e.message}")
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "error": {
                    "type": ErrorType.CONNECTION_LIMIT.value,
                    "message": e.message
                }
            }
        )
        
    except RTSPConnectionError as e:
        logger.error(f"RTSP connection error: {e.message}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "error": {
                    "type": ErrorType.UNREACHABLE.value,
                    "message": e.message
                }
            }
        )
        
    except Exception as e:
        logger.exception(f"Unexpected error during camera connection: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": {
                    "type": ErrorType.INTERNAL_ERROR.value,
                    "message": "Internal server error. Please try again."
                }
            }
        )


@router.post("/camera/disconnect", response_model=DisconnectResponse, status_code=status.HTTP_200_OK)
async def disconnect_camera(request: DisconnectRequest):
    """Disconnect from RTSP camera and stop HLS transcoding"""
    
    logger.info(f"Received disconnect request for session {request.session_id}")
    
    # Check if session exists
    if not hls_service.get_session(request.session_id):
        logger.warning(f"Session {request.session_id} not found")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error": {
                    "type": "session_not_found",
                    "message": "Session not found or already disconnected."
                }
            }
        )
    
    # Destroy session
    hls_service.destroy_session(request.session_id)
    logger.info(f"Session {request.session_id} disconnected successfully")
    
    return DisconnectResponse(
        status="disconnected",
        session_id=request.session_id
    )


@router.get("/camera/stream/{session_id}/playlist.m3u8")
async def get_playlist(session_id: str):
    """Serve HLS playlist file"""
    
    logger.debug(f"Playlist request for session {session_id}")
    
    # Get playlist path
    playlist_path = hls_service.get_playlist_path(session_id)
    
    if not playlist_path or not playlist_path.exists():
        logger.warning(f"Playlist not found for session {session_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error": {
                    "type": "session_not_found",
                    "message": "Stream session not found or expired."
                }
            }
        )
    
    # Update session activity
    session = hls_service.get_session(session_id)
    if session:
        session.update_activity()
    
    return FileResponse(
        path=str(playlist_path),
        media_type="application/vnd.apple.mpegurl",
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0"
        }
    )


@router.get("/camera/stream/{session_id}/{segment_file}")
async def get_segment(session_id: str, segment_file: str):
    """Serve HLS video segment file"""
    
    logger.debug(f"Segment request for session {session_id}: {segment_file}")
    
    # Validate segment filename to prevent path traversal
    if ".." in segment_file or "/" in segment_file or "\\" in segment_file:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": {
                    "type": "invalid_request",
                    "message": "Invalid segment filename."
                }
            }
        )
    
    # Get segment path
    segment_path = hls_service.get_segment_path(session_id, segment_file)
    
    if not segment_path or not segment_path.exists():
        logger.warning(f"Segment not found: {segment_file} for session {session_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error": {
                    "type": "segment_not_found",
                    "message": "Video segment not found."
                }
            }
        )
    
    # Update session activity
    session = hls_service.get_session(session_id)
    if session:
        session.update_activity()
    
    return FileResponse(
        path=str(segment_path),
        media_type="video/mp2t",
        headers={
            "Cache-Control": "public, max-age=31536000, immutable"
        }
    )


@router.get("/camera/status/{session_id}", response_model=StatusResponse, status_code=status.HTTP_200_OK)
async def get_status(session_id: str):
    """Get connection status and stream health"""
    
    logger.debug(f"Status request for session {session_id}")
    
    session = hls_service.get_session(session_id)
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error": {
                    "type": "session_not_found",
                    "message": "Session not found or expired."
                }
            }
        )
    
    return StatusResponse(
        status="connected",
        session_id=session.session_id,
        connected_at=session.created_at.isoformat() + "Z",
        stream_metadata=session.stream_metadata,
        last_activity=session.last_activity.isoformat() + "Z"
    )