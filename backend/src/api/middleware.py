"""Rate limiting middleware for API endpoints"""
import time
import logging
from typing import Dict, Tuple
from collections import defaultdict, deque
from fastapi import Request, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger(__name__)


class RateLimiter:
    """Simple in-memory rate limiter using sliding window"""
    
    def __init__(self, requests_per_minute: int):
        self.requests_per_minute = requests_per_minute
        self.requests: Dict[str, deque] = defaultdict(deque)
        self.window_seconds = 60
        
    def is_allowed(self, key: str) -> Tuple[bool, int]:
        """
        Check if request is allowed under rate limit
        
        Returns:
            (allowed: bool, remaining: int)
        """
        current_time = time.time()
        cutoff_time = current_time - self.window_seconds
        
        # Remove old requests outside the window
        while self.requests[key] and self.requests[key][0] < cutoff_time:
            self.requests[key].popleft()
            
        # Check if under limit
        request_count = len(self.requests[key])
        if request_count < self.requests_per_minute:
            self.requests[key].append(current_time)
            remaining = self.requests_per_minute - request_count - 1
            return True, remaining
        else:
            return False, 0
            
    def cleanup_old_keys(self):
        """Remove keys that haven't been accessed recently"""
        current_time = time.time()
        cutoff_time = current_time - self.window_seconds * 2
        
        keys_to_remove = []
        for key, requests in self.requests.items():
            if not requests or requests[-1] < cutoff_time:
                keys_to_remove.append(key)
                
        for key in keys_to_remove:
            del self.requests[key]


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Middleware to enforce rate limits on API endpoints"""
    
    def __init__(self, app, connect_limit: int = 10, disconnect_limit: int = 20):
        super().__init__(app)
        self.connect_limiter = RateLimiter(connect_limit)
        self.disconnect_limiter = RateLimiter(disconnect_limit)
        
    async def dispatch(self, request: Request, call_next):
        # Only rate limit specific endpoints
        path = request.url.path
        
        # Get client identifier (IP address)
        client_ip = request.client.host if request.client else "unknown"
        
        limiter = None
        endpoint_name = None
        
        if path == "/api/camera/connect" and request.method == "POST":
            limiter = self.connect_limiter
            endpoint_name = "connect"
        elif path == "/api/camera/disconnect" and request.method == "POST":
            limiter = self.disconnect_limiter
            endpoint_name = "disconnect"
            
        if limiter:
            allowed, remaining = limiter.is_allowed(client_ip)
            
            if not allowed:
                logger.warning(f"Rate limit exceeded for {client_ip} on {endpoint_name} endpoint")
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail={
                        "error": {
                            "type": "rate_limit_exceeded",
                            "message": f"Too many {endpoint_name} requests. Please try again later."
                        }
                    }
                )
                
            # Add rate limit headers to response
            response = await call_next(request)
            response.headers["X-RateLimit-Limit"] = str(limiter.requests_per_minute)
            response.headers["X-RateLimit-Remaining"] = str(remaining)
            return response
        else:
            return await call_next(request)
