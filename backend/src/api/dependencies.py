from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse
from src.core.exceptions import (
    TimelapserBaseException,
    RTSPConnectionError,
    RTSPTimeoutError, 
    RTSPAuthenticationError,
    RTSPUnreachableError,
    UnsupportedCodecError,
    ValidationError,
    ConnectionLimitError,
    SessionNotFoundError,
    FFmpegError,
    HLSError,
    RateLimitError
)
from src.models.connection import ErrorType
import logging

logger = logging.getLogger(__name__)


async def exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Global exception handler for converting exceptions to API responses"""
    
    # Map specific exceptions to HTTP status codes and error types
    error_mappings = {
        ValidationError: (400, ErrorType.INVALID_URL),
        RTSPAuthenticationError: (401, ErrorType.AUTH_REQUIRED), 
        RTSPTimeoutError: (408, ErrorType.TIMEOUT),
        UnsupportedCodecError: (415, ErrorType.UNSUPPORTED_CODEC),
        ConnectionLimitError: (429, ErrorType.CONNECTION_LIMIT),
        RTSPUnreachableError: (503, ErrorType.UNREACHABLE),
        SessionNotFoundError: (404, ErrorType.INTERNAL_ERROR),
        FFmpegError: (500, ErrorType.INTERNAL_ERROR),
        HLSError: (500, ErrorType.INTERNAL_ERROR),
        RateLimitError: (429, ErrorType.CONNECTION_LIMIT)
    }
    
    # Handle known Timelapser exceptions
    if isinstance(exc, TimelapserBaseException):
        status_code, error_type = error_mappings.get(type(exc), (500, ErrorType.INTERNAL_ERROR))
        
        # Log the error
        logger.error(f"{exc.__class__.__name__}: {exc.message}", extra={
            "error_type": error_type,
            "details": exc.details,
            "request_url": str(request.url)
        })
        
        return JSONResponse(
            status_code=status_code,
            content={
                "error": {
                    "type": error_type,
                    "message": exc.message,
                    "details": exc.details
                }
            }
        )
    
    # Handle FastAPI HTTPException
    if isinstance(exc, HTTPException):
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": {
                    "type": "http_error",
                    "message": exc.detail
                }
            }
        )
    
    # Handle unexpected exceptions
    logger.exception("Unexpected error occurred", extra={
        "request_url": str(request.url)
    })
    
    return JSONResponse(
        status_code=500,
        content={
            "error": {
                "type": ErrorType.INTERNAL_ERROR,
                "message": "Internal server error occurred"
            }
        }
    )