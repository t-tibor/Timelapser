from fastapi import APIRouter, HTTPException, status
from datetime import datetime
from src.core.config import settings
import os

router = APIRouter()

@router.get("/health")
async def health_check():
    """Health check endpoint for k8s liveness/readiness probes"""
    
    # Check if ffmpeg is available (handle both absolute paths and command names)
    ffmpeg_available = os.path.exists(settings.ffmpeg_binary) or os.path.isfile(settings.ffmpeg_binary)
    
    if not ffmpeg_available:
        # Also try which() for system commands
        import shutil
        ffmpeg_available = shutil.which(settings.ffmpeg_binary) is not None
    
    if not ffmpeg_available:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "status": "unhealthy",
                "timestamp": datetime.utcnow().isoformat(),
                "error": "ffmpeg binary not found",
                "ffmpeg_path": settings.ffmpeg_binary
            }
        )
    
    return {
        "status": "healthy", 
        "timestamp": datetime.utcnow().isoformat(),
        "version": settings.api_version,
        "ffmpeg_path": settings.ffmpeg_binary
    }
