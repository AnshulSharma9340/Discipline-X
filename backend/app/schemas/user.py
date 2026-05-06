import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr

from app.models.organization import OrgRole
from app.models.user import AccessStatus, UserRole


class UserBase(BaseModel):
    email: EmailStr
    name: str = ""
    avatar_url: str | None = None


class UserPublic(UserBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    role: UserRole
    access_status: AccessStatus
    discipline_score: int
    productivity_score: int
    xp: int
    streak: int
    longest_streak: int
    level: int
    freeze_tokens: int
    bio: str
    theme: str
    unlocked_themes: str
    org_id: uuid.UUID | None = None
    org_role: OrgRole | None = None
    created_at: datetime


class UserUpdate(BaseModel):
    name: str | None = None
    avatar_url: str | None = None


class UserAdminUpdate(BaseModel):
    role: UserRole | None = None
    access_status: AccessStatus | None = None
