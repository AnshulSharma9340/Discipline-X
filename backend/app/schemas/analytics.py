import uuid
from datetime import date

from pydantic import BaseModel, ConfigDict


class DailyAnalyticsPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    date: date
    tasks_assigned: int
    tasks_submitted: int
    tasks_approved: int
    tasks_rejected: int
    productivity_score: float
    discipline_score: float
    focus_score: float
    study_minutes: int
    points_earned: int


class LeaderboardEntry(BaseModel):
    rank: int
    user_id: uuid.UUID
    name: str
    avatar_url: str | None
    discipline_score: int
    productivity_score: int
    xp: int
    streak: int
