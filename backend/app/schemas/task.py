import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.task import TaskDifficulty


class TaskBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: str = ""
    difficulty: TaskDifficulty = TaskDifficulty.MEDIUM
    points: int = Field(10, ge=0, le=1000)
    is_required: bool = True
    proof_required: bool = True
    proof_instructions: str = ""
    task_date: datetime
    deadline: datetime


class TaskCreate(TaskBase):
    pass


class TaskUpdate(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=200)
    description: str | None = None
    difficulty: TaskDifficulty | None = None
    points: int | None = Field(None, ge=0, le=1000)
    is_required: bool | None = None
    proof_required: bool | None = None
    proof_instructions: str | None = None
    deadline: datetime | None = None
    is_archived: bool | None = None


class TaskPublic(TaskBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    is_archived: bool
    created_by: uuid.UUID | None
    created_at: datetime
