from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.core.config import settings
from src.api.dependencies import exception_handler
from src.api.middleware import RateLimitMiddleware
from src.api.routes.camera import router as camera_router, hls_service
from src.api.routes.health import router as health_router
import logging
import sys

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.log_level.upper()),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    stream=sys.stdout
)

logger = logging.getLogger(__name__)

# Create FastAPI application
app = FastAPI(
    title=settings.api_title,
    description=settings.api_description, 
    version=settings.api_version,
    debug=settings.debug
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=settings.cors_allow_credentials,
    allow_methods=settings.cors_allow_methods,
    allow_headers=settings.cors_allow_headers,
)

# Add rate limiting middleware
app.add_middleware(
    RateLimitMiddleware,
    connect_limit=settings.rate_limit_connect,
    disconnect_limit=settings.rate_limit_disconnect
)

# Add global exception handler
app.add_exception_handler(Exception, exception_handler)

# Include routers
app.include_router(camera_router, prefix="/api", tags=["camera"])
app.include_router(health_router, prefix="/api", tags=["health"])


@app.on_event("startup")
async def startup_event():
    """Initialize background tasks on application startup"""
    logger.info("Starting up Timelapser backend...")
    await hls_service.start_cleanup_task()
    logger.info("Background cleanup task started")


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup resources on application shutdown"""
    logger.info("Shutting down Timelapser backend...")
    hls_service.cleanup_all()
    logger.info("All sessions cleaned up")

# Root endpoint
@app.get("/")
async def root():
    return {
        "message": "Timelapser RTSP Backend",
        "version": settings.api_version,
        "status": "running"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=settings.host, port=settings.port)