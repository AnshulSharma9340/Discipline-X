import enum
import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models._mixins import TimestampMixin

if TYPE_CHECKING:
    from app.models.submission import TaskSubmission
    from app.models.user import User


class TaskDifficulty(str, enum.Enum):
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"
    INSANE = "insane"


class DailyTask(Base, TimestampMixin):
    """A task assigned globally to all users for a given day.

    `task_date` is the calendar day (UTC) the task is active. The system
    materializes one TaskSubmission per (user, task) on demand.
    """

    __tablename__ = "daily_tasks"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")

    difficulty: Mapped[TaskDifficulty] = mapped_column(
        Enum(TaskDifficulty, name="task_difficulty"),
        default=TaskDifficulty.MEDIUM,
        nullable=False,
    )
    points: Mapped[int] = mapped_column(Integer, default=10, nullable=False)
    is_required: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    proof_required: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    proof_instructions: Mapped[str] = mapped_column(Text, default="", nullable=False)

    # Active window: assigned for `task_date`, must be submitted by `deadline`
    task_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    deadline: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    is_archived: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Organization the task belongs to (multi-tenancy)
    org_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )

    created_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    creator: Mapped["User | None"] = relationship(back_populates="created_tasks", foreign_keys=[created_by])

    submissions: Mapped[list["TaskSubmission"]] = relationship(
        back_populates="task",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<DailyTask {self.title} {self.task_date.date()}>"
