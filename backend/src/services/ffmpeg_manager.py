"""FFmpeg process manager for HLS transcoding"""
import subprocess
import logging
import os
import signal
from typing import Optional, Dict
from pathlib import Path
from uuid import uuid4

logger = logging.getLogger(__name__)


class FFmpegProcess:
    """Represents a running ffmpeg transcoding process"""
    
    def __init__(self, process: subprocess.Popen, session_id: str, output_dir: Path):
        self.process = process
        self.session_id = session_id
        self.output_dir = output_dir
        
    def is_running(self) -> bool:
        """Check if ffmpeg process is still running"""
        return self.process.poll() is None
        
    def terminate(self):
        """Gracefully terminate ffmpeg process"""
        if self.is_running():
            try:
                self.process.terminate()
                self.process.wait(timeout=5)
                logger.info(f"FFmpeg process terminated for session {self.session_id}")
            except subprocess.TimeoutExpired:
                logger.warning(f"FFmpeg process did not terminate gracefully, killing for session {self.session_id}")
                self.process.kill()
                self.process.wait()
            except Exception as e:
                logger.error(f"Error terminating ffmpeg process for session {self.session_id}: {e}")
                

class FFmpegManager:
    """Manages ffmpeg process lifecycle and temporary directory cleanup"""
    
    def __init__(self, base_output_dir: str):
        self.base_output_dir = Path(base_output_dir)
        self.active_processes: Dict[str, FFmpegProcess] = {}
        
        # Ensure base output directory exists
        self.base_output_dir.mkdir(parents=True, exist_ok=True)
        logger.info(f"FFmpegManager initialized with output dir: {self.base_output_dir}")
        
    def create_session_directory(self, session_id: str) -> Path:
        """Create temporary directory for HLS segments"""
        session_dir = self.base_output_dir / session_id
        session_dir.mkdir(parents=True, exist_ok=True)
        logger.info(f"Created session directory: {session_dir}")
        return session_dir
        
    def spawn_process(
        self,
        session_id: str,
        rtsp_url: str,
        output_dir: Path,
        username: Optional[str] = None,
        password: Optional[str] = None,
        hwaccel: bool = True
    ) -> FFmpegProcess:
        """Spawn ffmpeg process for RTSP to HLS transcoding"""
        
        # Build RTSP URL with credentials if provided
        if username and password:
            # Format: rtsp://username:password@host:port/path
            protocol, rest = rtsp_url.split('://', 1)
            rtsp_url = f"{protocol}://{username}:{password}@{rest}"
            
        playlist_path = output_dir / "playlist.m3u8"
        segment_pattern = output_dir / "segment_%03d.ts"
        
        # Build ffmpeg command
        cmd = ["ffmpeg"]
        
        # Hardware acceleration for ARM64 (Raspberry Pi 5)
        if hwaccel:
            cmd.extend(["-hwaccel", "auto"])
            
        cmd.extend([
            "-rtsp_transport", "tcp",  # Use TCP for better reliability
            "-i", rtsp_url,
            "-c:v", "copy",  # Copy video stream without re-encoding when possible
            "-c:a", "aac",  # Encode audio to AAC
            "-f", "hls",
            "-hls_time", "2",  # 2-second segments
            "-hls_list_size", "5",  # Keep last 5 segments in playlist
            "-hls_flags", "delete_segments",  # Auto-delete old segments
            "-hls_segment_filename", str(segment_pattern),
            str(playlist_path)
        ])
        
        logger.info(f"Starting ffmpeg for session {session_id}")
        logger.debug(f"FFmpeg command: {' '.join(cmd)}")
        
        try:
            process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                stdin=subprocess.PIPE
            )
            
            ffmpeg_proc = FFmpegProcess(process, session_id, output_dir)
            self.active_processes[session_id] = ffmpeg_proc
            
            logger.info(f"FFmpeg process spawned for session {session_id} (PID: {process.pid})")
            return ffmpeg_proc
            
        except Exception as e:
            logger.error(f"Failed to spawn ffmpeg process for session {session_id}: {e}")
            raise
            
    def kill_process(self, session_id: str):
        """Kill ffmpeg process and cleanup resources"""
        if session_id not in self.active_processes:
            logger.warning(f"No active process found for session {session_id}")
            return
            
        ffmpeg_proc = self.active_processes[session_id]
        ffmpeg_proc.terminate()
        
        # Cleanup session directory
        self._cleanup_directory(ffmpeg_proc.output_dir)
        
        # Remove from active processes
        del self.active_processes[session_id]
        logger.info(f"Cleaned up session {session_id}")
        
    def _cleanup_directory(self, directory: Path):
        """Remove temporary directory and all contents"""
        try:
            if directory.exists():
                import shutil
                shutil.rmtree(directory)
                logger.info(f"Removed directory: {directory}")
        except Exception as e:
            logger.error(f"Error removing directory {directory}: {e}")
            
    def get_process(self, session_id: str) -> Optional[FFmpegProcess]:
        """Get active ffmpeg process by session ID"""
        return self.active_processes.get(session_id)
        
    def is_session_active(self, session_id: str) -> bool:
        """Check if session has active ffmpeg process"""
        if session_id not in self.active_processes:
            return False
        return self.active_processes[session_id].is_running()
        
    def cleanup_all(self):
        """Terminate all active processes and cleanup"""
        logger.info("Cleaning up all ffmpeg processes")
        for session_id in list(self.active_processes.keys()):
            self.kill_process(session_id)
