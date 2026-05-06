import enum
import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models._mixins import TimestampMixin

if TYPE_CHECKING:
    from app.models.task import DailyTask
    from app.models.user import User


class SubmissionStatus(str, enum.Enum):
    ASSIGNED = "assigned"
    SUBMITTED = "submitted"
    UNDER_REVIEW = "under_review"
    APPROVED = "approved"
    REJECTED = "rejected"


class ProofType(str, enum.Enum):
    IMAGE = "image"
    PDF = "pdf"
    STOPWATCH = "stopwatch"
    CODE_SCREENSHOT = "code_screenshot"
    GITHUB_LINK = "github_link"
    NOTES = "notes"


class TaskSubmission(Base, TimestampMixin):
    __tablename__ = "task_submissions"
    __table_args__ = (
        UniqueConstraint("user_id", "task_id", name="uq_user_task"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    task_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("daily_tasks.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    status: Mapped[SubmissionStatus] = mapped_column(
        Enum(SubmissionStatus, name="submission_status"),
        default=SubmissionStatus.ASSIGNED,
        nullable=False,
        index=True,
    )

    # Proof storage — paths in Supabase Storage, plus structured metadata
    proof_type: Mapped[ProofType | None] = mapped_column(
        Enum(ProofType, name="proof_type"),
        nullable=True,
    )
    proof_image_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    proof_pdf_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    stopwatch_image_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    proof_url: Mapped[str | None] = mapped_column(String(1000), nullable=True)  # github link etc.
    proof_meta: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    notes: Mapped[str] = mapped_column(Text, default="", nullable=False)
    admin_feedback: Mapped[str] = mapped_column(Text, default="", nullable=False)

    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    reviewed_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    points_awarded: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Anti-cheat: perceptual hash for image proofs
    proof_hash: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    is_duplicate_proof: Mapped[bool] = mapped_column(
        __import__("sqlalchemy").Boolean, default=False, nullable=False
    )

    # AI verification (when Claude API is wired in)
    ai_verified: Mapped[bool] = mapped_column(
        __import__("sqlalchemy").Boolean, default=False, nullable=False
    )
    ai_confidence: Mapped[float | None] = mapped_column(Integer, nullable=True)
    ai_reasoning: Mapped[str] = mapped_column(Text, default="", nullable=False)

    user: Mapped["User"] = relationship(back_populates="submissions", foreign_keys=[user_id])
    task: Mapped["DailyTask"] = relationship(back_populates="submissions")

    def __repr__(self) -> str:
        return f"<TaskSubmission user={self.user_id} task={self.task_id} {self.status.value}>"
