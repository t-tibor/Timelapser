"""RTSP connection service for URL validation and connectivity testing"""
import re
import logging
import subprocess
import asyncio
from typing import Optional, Tuple
from src.core.exceptions import (
    RTSPConnectionError,
    ValidationError,
    AuthenticationError,
    TimeoutError,
    UnsupportedCodecError
)

logger = logging.getLogger(__name__)


class RTSPService:
    """Handles RTSP connection validation and codec detection"""
    
    RTSP_URL_PATTERN = re.compile(
        r'^rtsp://(?:([^:]+):([^@]+)@)?'  # Optional username:password@
        r'([^:/]+)'  # Hostname/IP
        r'(?::(\d{1,5}))?'  # Optional :port
        r'(/.*)?$'  # Optional path
    )
    
    SUPPORTED_CODECS = {'h264', 'hevc', 'h265'}
    TIMEOUT_SECONDS = 10
    
    @classmethod
    def validate_url_format(cls, rtsp_url: str) -> bool:
        """Validate RTSP URL format"""
        return bool(cls.RTSP_URL_PATTERN.match(rtsp_url))
        
    @classmethod
    def extract_credentials(cls, rtsp_url: str) -> Tuple[str, Optional[str], Optional[str]]:
        """Extract username and password from RTSP URL if present
        
        Returns:
            (clean_url, username, password)
        """
        match = cls.RTSP_URL_PATTERN.match(rtsp_url)
        if not match:
            return rtsp_url, None, None
            
        username, password, host, port, path = match.groups()
        
        # Reconstruct URL without credentials
        clean_url = f"rtsp://{host}"
        if port:
            clean_url += f":{port}"
        if path:
            clean_url += path
            
        return clean_url, username, password
        
    @classmethod
    async def test_connection(
        cls,
        rtsp_url: str,
        username: Optional[str] = None,
        password: Optional[str] = None
    ) -> Tuple[bool, Optional[str]]:
        """Test RTSP connection and detect codec
        
        Returns:
            (success, codec_name)
            
        Raises:
            ValidationError: Invalid URL format
            AuthenticationError: Authentication required or failed
            TimeoutError: Connection timeout
            RTSPConnectionError: Cannot reach camera
            UnsupportedCodecError: Codec not supported
        """
        # Validate URL format
        if not cls.validate_url_format(rtsp_url):
            raise ValidationError(
                "Invalid RTSP URL format. Expected: rtsp://hostname:port/path"
            )
            
        # Build URL with credentials
        test_url = rtsp_url
        if username and password:
            protocol, rest = rtsp_url.split('://', 1)
            test_url = f"{protocol}://{username}:{password}@{rest}"
            
        logger.info(f"Testing RTSP connection to {rtsp_url}")
        
        try:
            # Use ffprobe to test connection and detect codec
            cmd = [
                "ffprobe",
                "-rtsp_transport", "tcp",
                "-timeout", str(cls.TIMEOUT_SECONDS * 1000000),  # microseconds
                "-v", "error",
                "-select_streams", "v:0",
                "-show_entries", "stream=codec_name",
                "-of", "default=noprint_wrappers=1:nokey=1",
                test_url
            ]
            
            logger.debug(f"Running ffprobe: {' '.join(cmd)}")
            
            # Run ffprobe with timeout
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            try:
                stdout, stderr = await asyncio.wait_for(
                    process.communicate(),
                    timeout=cls.TIMEOUT_SECONDS
                )
            except asyncio.TimeoutError:
                process.kill()
                logger.error(f"Connection timeout for {rtsp_url}")
                raise TimeoutError(
                    "Connection timeout. Camera not responding."
                )
                
            # Check return code
            if process.returncode != 0:
                stderr_text = stderr.decode('utf-8', errors='ignore')
                logger.error(f"ffprobe failed: {stderr_text}")
                
                # Parse error message to determine cause
                if "401" in stderr_text or "Unauthorized" in stderr_text:
                    raise AuthenticationError(
                        "Authentication required. Please provide username and password."
                    )
                elif "Connection refused" in stderr_text or "No route to host" in stderr_text:
                    raise RTSPConnectionError(
                        "Cannot reach camera. Check IP address and network connection."
                    )
                elif "Connection timed out" in stderr_text:
                    raise TimeoutError(
                        "Connection timeout. Camera not responding."
                    )
                else:
                    raise RTSPConnectionError(
                        f"Failed to connect to camera: {stderr_text[:200]}"
                    )
                    
            # Parse codec from output
            codec = stdout.decode('utf-8').strip().lower()
            logger.info(f"Detected codec: {codec}")
            
            # Validate codec is supported
            if codec not in cls.SUPPORTED_CODECS:
                raise UnsupportedCodecError(
                    f"Unsupported video format. Camera must use H.264 or H.265 codec. Detected: {codec}"
                )
                
            # Normalize codec name (hevc -> h265)
            if codec == 'hevc':
                codec = 'h265'
                
            return True, codec
            
        except (ValidationError, AuthenticationError, TimeoutError, RTSPConnectionError, UnsupportedCodecError):
            # Re-raise our custom exceptions
            raise
        except Exception as e:
            logger.error(f"Unexpected error testing RTSP connection: {e}")
            raise RTSPConnectionError(
                "Failed to connect to camera. Please check the URL and try again."
            )
            
    @classmethod
    async def probe_stream_metadata(
        cls,
        rtsp_url: str,
        username: Optional[str] = None,
        password: Optional[str] = None
    ) -> dict:
        """Get detailed stream metadata (resolution, fps, codec)
        
        Returns:
            dict with resolution, codec, fps
        """
        # Build URL with credentials
        test_url = rtsp_url
        if username and password:
            protocol, rest = rtsp_url.split('://', 1)
            test_url = f"{protocol}://{username}:{password}@{rest}"
            
        try:
            cmd = [
                "ffprobe",
                "-rtsp_transport", "tcp",
                "-timeout", str(cls.TIMEOUT_SECONDS * 1000000),
                "-v", "error",
                "-select_streams", "v:0",
                "-show_entries", "stream=codec_name,width,height,r_frame_rate",
                "-of", "json",
                test_url
            ]
            
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            stdout, stderr = await asyncio.wait_for(
                process.communicate(),
                timeout=cls.TIMEOUT_SECONDS
            )
            
            if process.returncode != 0:
                # Return default metadata if probe fails
                logger.warning(f"Failed to probe stream metadata: {stderr.decode()}")
                return {
                    "resolution": "unknown",
                    "codec": "h264",  # Default assumption
                    "fps": 30
                }
                
            import json
            data = json.loads(stdout.decode())
            
            stream = data.get('streams', [{}])[0]
            
            width = stream.get('width', 0)
            height = stream.get('height', 0)
            resolution = f"{width}x{height}" if width and height else "unknown"
            
            codec = stream.get('codec_name', 'h264').lower()
            if codec == 'hevc':
                codec = 'h265'
                
            # Parse frame rate (format: "30/1" or "30000/1001")
            fps_str = stream.get('r_frame_rate', '30/1')
            try:
                num, den = map(int, fps_str.split('/'))
                fps = round(num / den)
            except:
                fps = 30
                
            return {
                "resolution": resolution,
                "codec": codec,
                "fps": fps
            }
            
        except Exception as e:
            logger.error(f"Error probing stream metadata: {e}")
            return {
                "resolution": "unknown",
                "codec": "h264",
                "fps": 30
            }
