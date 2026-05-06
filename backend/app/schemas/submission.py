import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict

from app.models.submission import ProofType, SubmissionStatus


class SubmissionCreate(BaseModel):
    proof_type: ProofType | None = None
    proof_url: str | None = None
    notes: str = ""
    proof_meta: dict[str, Any] | None = None


class SubmissionReview(BaseModel):
    approve: bool
    feedback: str = ""


class SubmissionPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    task_id: uuid.UUID
    status: SubmissionStatus
    proof_type: ProofType | None
    proof_image_path: str | None
    proof_pdf_path: str | None
    stopwatch_image_path: str | None
    proof_url: str | None
    notes: str
    admin_feedback: str
    submitted_at: datetime | None
    reviewed_at: datetime | None
    points_awarded: int
    created_at: datetime
