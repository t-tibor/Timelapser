class TimelapserBaseException(Exception):
    """Base exception for all Timelapser application errors"""
    def __init__(self, message: str, details: dict = None):
        self.message = message
        self.details = details or {}
        super().__init__(self.message)


class RTSPConnectionError(TimelapserBaseException):
    """Raised when RTSP connection fails"""
    pass


class RTSPTimeoutError(RTSPConnectionError):
    """Raised when RTSP connection times out"""
    pass


class RTSPAuthenticationError(RTSPConnectionError):
    """Raised when RTSP authentication fails"""
    pass


class AuthenticationError(RTSPAuthenticationError):
    """Alias for RTSPAuthenticationError"""
    pass


class TimeoutError(RTSPConnectionError):
    """Raised when connection times out"""
    pass


class RTSPUnreachableError(RTSPConnectionError):
    """Raised when RTSP camera is unreachable"""
    pass


class UnsupportedCodecError(TimelapserBaseException):
    """Raised when video codec is not supported (not H.264/H.265)"""
    pass


class ValidationError(TimelapserBaseException):
    """Raised when input validation fails"""
    pass


class ConnectionLimitError(TimelapserBaseException):
    """Raised when maximum concurrent connections reached"""
    pass


class SessionNotFoundError(TimelapserBaseException):
    """Raised when session ID is not found"""
    pass


class FFmpegError(TimelapserBaseException):
    """Raised when ffmpeg process fails"""
    pass


class HLSError(TimelapserBaseException):
    """Raised when HLS streaming fails"""
    pass


class RateLimitError(TimelapserBaseException):
    """Raised when rate limit is exceeded"""
    pass