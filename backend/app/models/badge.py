import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.user import User


class UserBadge(Base):
    """A badge a user has unlocked.

    Badge definitions live in code (services/badges.py) — only earned
    instances are persisted, keyed by (user_id, badge_code).
    """

    __tablename__ = "user_badges"
    __table_args__ = (UniqueConstraint("user_id", "badge_code", name="uq_user_badge"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    badge_code: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    earned_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    user: Mapped["User"] = relationship(backref="badges")
