from pydantic import BaseModel, Field, field_validator
from datetime import datetime
from typing import Optional
from uuid import UUID, uuid4


class CameraConfiguration(BaseModel):
    """Saved camera configuration for localStorage persistence"""
    id: str = Field(default_factory=lambda: str(uuid4()))
    name: str = Field(..., min_length=1, max_length=50)
    rtsp_url: str = Field(..., pattern=r'^rtsp://[\w\.\-]+(?::\d{1,5})?(?:/[\w\-\./]*)?$')
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_used_at: Optional[datetime] = None
    requires_auth: bool = False

    @field_validator('name')
    @classmethod
    def name_must_not_be_empty(cls, v):
        if not v.strip():
            raise ValueError('Camera name cannot be empty')
        return v.strip()

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }
        schema_extra = {
            "example": {
                "id": "550e8400-e29b-41d4-a716-446655440000",
                "name": "Front Door Camera", 
                "rtsp_url": "rtsp://192.168.1.100:554/stream",
                "created_at": "2025-12-31T14:30:00Z",
                "last_used_at": "2025-12-31T15:45:00Z",
                "requires_auth": True
            }
        }