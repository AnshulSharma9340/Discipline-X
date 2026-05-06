import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.emergency import EmergencyStatus


class EmergencyCreate(BaseModel):
    reason: str = Field(..., min_length=10, max_length=2000)


class EmergencyReview(BaseModel):
    approve: bool
    response: str = ""
    unlock_hours: int = Field(24, ge=1, le=168)


class EmergencyPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    reason: str
    proof_path: str | None
    status: EmergencyStatus
    admin_response: str
    reviewed_at: datetime | None
    unlock_until: datetime | None
    created_at: datetime
