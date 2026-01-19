from pydantic_settings import BaseSettings
from typing import Optional
import os
import shutil


def get_ffmpeg_path() -> str:
    """Get ffmpeg path, preferring bundled version from imageio-ffmpeg"""
    try:
        import imageio_ffmpeg
        bundled_path = imageio_ffmpeg.get_ffmpeg_exe()
        if bundled_path and os.path.exists(bundled_path):
            return bundled_path
    except ImportError:
        pass
    
    # Fall back to system ffmpeg
    system_ffmpeg = shutil.which('ffmpeg')
    if system_ffmpeg:
        return system_ffmpeg
    
    return 'ffmpeg'  # Last resort, will fail if not found


class Settings(BaseSettings):
    """Application configuration settings"""
    
    # API Configuration
    api_title: str = "Timelapser RTSP Backend"
    api_version: str = "1.0.0" 
    api_description: str = "Backend API for RTSP camera connection and video preview"
    
    # Server Configuration
    host: str = "0.0.0.0"
    port: int = 8000
    debug: bool = False
    
    # CORS Configuration
    cors_origins: list[str] = ["http://localhost:3000", "https://timelapser.local"]
    cors_allow_credentials: bool = True
    cors_allow_methods: list[str] = ["GET", "POST", "OPTIONS"]
    cors_allow_headers: list[str] = ["Content-Type", "Accept", "Authorization"]
    
    # RTSP Configuration
    rtsp_connection_timeout: int = 10  # seconds
    rtsp_max_reconnect_attempts: int = 3
    rtsp_reconnect_delays: list[int] = [2, 4, 8]  # exponential backoff in seconds
    
    # HLS Configuration  
    hls_segment_duration: int = 2  # seconds
    hls_playlist_size: int = 3  # number of segments
    hls_output_dir: str = "/tmp/hls_streams"
    hls_temp_dir: str = "/tmp/hls_streams"  # Alias for compatibility
    hls_cleanup_interval: int = 3600  # 1 hour in seconds
    
    # ffmpeg Configuration
    ffmpeg_binary: str = get_ffmpeg_path()
    ffmpeg_hardware_acceleration: bool = True  # Use h264_v4l2m2m on ARM64
    ffmpeg_hwaccel: bool = True  # Alias for compatibility
    
    # Rate Limiting
    rate_limit_connect: int = 10  # requests per minute
    rate_limit_disconnect: int = 20  # requests per minute
    
    # Session Management
    session_timeout: int = 3600  # 1 hour in seconds
    max_concurrent_connections: int = 1
    
    # Logging
    log_level: str = "INFO"
    log_format: str = "json"
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False


# Global settings instance
settings = Settings()