import uuid
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models._mixins import TimestampMixin

if TYPE_CHECKING:
    from app.models.submission import TaskSubmission
    from app.models.user import User


class SubmissionReaction(Base, TimestampMixin):
    """Emoji reaction on an approved submission ('🔥', '👏', '💪', '🚀')."""

    __tablename__ = "submission_reactions"
    __table_args__ = (
        UniqueConstraint("submission_id", "user_id", "emoji", name="uq_reaction"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    submission_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("task_submissions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    emoji: Mapped[str] = mapped_column(String(8), nullable=False)

    submission: Mapped["TaskSubmission"] = relationship(backref="reactions")
    user: Mapped["User"] = relationship()
