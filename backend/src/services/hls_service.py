"""HLS transcoding service for RTSP to HLS conversion"""
import logging
import asyncio
from typing import Optional, Dict
from pathlib import Path
from uuid import uuid4
from datetime import datetime, timedelta
from src.services.ffmpeg_manager import FFmpegManager
from src.services.rtsp_service import RTSPService
from src.models.connection import StreamMetadata, ConnectionStatus
from src.core.config import settings

logger = logging.getLogger(__name__)


class HLSSession:
    """Represents an active HLS streaming session"""
    
    def __init__(
        self,
        session_id: str,
        rtsp_url: str,
        output_dir: Path,
        stream_metadata: StreamMetadata,
        created_at: datetime
    ):
        self.session_id = session_id
        self.rtsp_url = rtsp_url
        self.output_dir = output_dir
        self.stream_metadata = stream_metadata
        self.created_at = created_at
        self.last_activity = created_at
        
    def get_playlist_url(self) -> str:
        """Get HLS playlist URL for this session"""
        return f"/api/camera/stream/{self.session_id}/playlist.m3u8"
        
    def get_playlist_path(self) -> Path:
        """Get filesystem path to HLS playlist"""
        return self.output_dir / "playlist.m3u8"
        
    def get_segment_path(self, segment_file: str) -> Path:
        """Get filesystem path to HLS segment"""
        return self.output_dir / segment_file
        
    def update_activity(self):
        """Update last activity timestamp"""
        self.last_activity = datetime.utcnow()


class HLSService:
    """Manages RTSP to HLS transcoding sessions"""
    
    def __init__(self):
        self.ffmpeg_manager = FFmpegManager(settings.hls_output_dir)
        self.active_sessions: Dict[str, HLSSession] = {}
        self._cleanup_task: Optional[asyncio.Task] = None
        logger.info("HLSService initialized")
        
    async def start_cleanup_task(self):
        """Start background task for session cleanup"""
        if self._cleanup_task is None:
            self._cleanup_task = asyncio.create_task(self._periodic_cleanup())
            logger.info("Started periodic cleanup task")
            
    async def _periodic_cleanup(self):
        """Periodically cleanup expired sessions and monitor ffmpeg processes"""
        while True:
            try:
                await asyncio.sleep(settings.hls_cleanup_interval)
                await self._cleanup_expired_sessions()
                await self._monitor_ffmpeg_processes()
            except Exception as e:
                logger.error(f"Error in periodic cleanup: {e}")
                
    async def _cleanup_expired_sessions(self):
        """Remove sessions that have exceeded the timeout"""
        timeout = timedelta(seconds=settings.session_timeout)
        current_time = datetime.utcnow()
        expired_sessions = []
        
        for session_id, session in self.active_sessions.items():
            if current_time - session.last_activity > timeout:
                expired_sessions.append(session_id)
                logger.info(f"Session {session_id} expired (last activity: {session.last_activity})")
                
        for session_id in expired_sessions:
            self.destroy_session(session_id)
            
        if expired_sessions:
            logger.info(f"Cleaned up {len(expired_sessions)} expired session(s)")
            
    async def _monitor_ffmpeg_processes(self):
        """Check if ffmpeg processes are still running and cleanup crashed ones"""
        crashed_sessions = []
        
        for session_id in list(self.active_sessions.keys()):
            if not self.ffmpeg_manager.is_session_active(session_id):
                logger.warning(f"ffmpeg process for session {session_id} is not running")
                crashed_sessions.append(session_id)
                
        for session_id in crashed_sessions:
            self.destroy_session(session_id)
            logger.info(f"Cleaned up crashed session {session_id}")
            
        if crashed_sessions:
            logger.warning(f"Detected and cleaned up {len(crashed_sessions)} crashed session(s)")
        
    async def create_session(
        self,
        rtsp_url: str,
        username: Optional[str] = None,
        password: Optional[str] = None
    ) -> HLSSession:
        """Create new HLS streaming session
        
        Returns:
            HLSSession object
            
        Raises:
            Various exceptions from RTSPService
        """
        # Test RTSP connection first
        logger.info(f"Testing RTSP connection before creating session")
        success, codec = await RTSPService.test_connection(rtsp_url, username, password)
        
        if not success:
            raise Exception("RTSP connection test failed")
            
        # Get detailed stream metadata
        metadata_dict = await RTSPService.probe_stream_metadata(rtsp_url, username, password)
        stream_metadata = StreamMetadata(
            resolution=metadata_dict['resolution'],
            codec=metadata_dict['codec'],
            fps=metadata_dict['fps']
        )
        
        # Generate session ID and create output directory
        session_id = str(uuid4())
        output_dir = self.ffmpeg_manager.create_session_directory(session_id)
        
        logger.info(f"Creating HLS session {session_id} for {rtsp_url}")
        
        # Spawn ffmpeg process
        try:
            self.ffmpeg_manager.spawn_process(
                session_id=session_id,
                rtsp_url=rtsp_url,
                output_dir=output_dir,
                username=username,
                password=password,
                hwaccel=settings.ffmpeg_hwaccel
            )
        except Exception as e:
            logger.error(f"Failed to spawn ffmpeg process: {e}")
            # Cleanup directory if process spawn failed
            self.ffmpeg_manager._cleanup_directory(output_dir)
            raise
            
        # Create session object
        session = HLSSession(
            session_id=session_id,
            rtsp_url=rtsp_url,
            output_dir=output_dir,
            stream_metadata=stream_metadata,
            created_at=datetime.utcnow()
        )
        
        self.active_sessions[session_id] = session
        logger.info(f"HLS session {session_id} created successfully")
        
        return session
        
    def get_session(self, session_id: str) -> Optional[HLSSession]:
        """Get active session by ID"""
        return self.active_sessions.get(session_id)
        
    def destroy_session(self, session_id: str):
        """Terminate HLS session and cleanup resources"""
        if session_id not in self.active_sessions:
            logger.warning(f"Session {session_id} not found")
            return
            
        logger.info(f"Destroying HLS session {session_id}")
        
        # Kill ffmpeg process and cleanup files
        self.ffmpeg_manager.kill_process(session_id)
        
        # Remove from active sessions
        del self.active_sessions[session_id]
        logger.info(f"Session {session_id} destroyed")
        
    def is_session_active(self, session_id: str) -> bool:
        """Check if session exists and ffmpeg process is running"""
        if session_id not in self.active_sessions:
            return False
        return self.ffmpeg_manager.is_session_active(session_id)
        
    def get_playlist_path(self, session_id: str) -> Optional[Path]:
        """Get filesystem path to HLS playlist for session"""
        session = self.get_session(session_id)
        if not session:
            return None
        return session.get_playlist_path()
        
    def get_segment_path(self, session_id: str, segment_file: str) -> Optional[Path]:
        """Get filesystem path to HLS segment for session"""
        session = self.get_session(session_id)
        if not session:
            return None
        return session.get_segment_path(segment_file)
        
    def cleanup_all(self):
        """Cleanup all active sessions"""
        logger.info("Cleaning up all HLS sessions")
        for session_id in list(self.active_sessions.keys()):
            self.destroy_session(session_id)
            
    def get_active_session_count(self) -> int:
        """Get count of active sessions"""
        return len(self.active_sessions)
