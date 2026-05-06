import uuid
from datetime import date
from typing import TYPE_CHECKING

from sqlalchemy import Date, ForeignKey, Integer, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models._mixins import TimestampMixin

if TYPE_CHECKING:
    from app.models.user import User


class Reflection(Base, TimestampMixin):
    """End-of-day journal + morning mood/sleep check-in. One row per (user, date)."""

    __tablename__ = "reflections"
    __table_args__ = (UniqueConstraint("user_id", "date", name="uq_reflection_user_date"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    date: Mapped[date] = mapped_column(Date, nullable=False, index=True)

    # Morning check-in
    sleep_hours: Mapped[float | None] = mapped_column(nullable=True)
    mood: Mapped[int | None] = mapped_column(Integer, nullable=True)  # 1-5
    energy: Mapped[int | None] = mapped_column(Integer, nullable=True)  # 1-5

    # Evening reflection
    shipped: Mapped[str] = mapped_column(Text, default="", nullable=False)
    blocked: Mapped[str] = mapped_column(Text, default="", nullable=False)
    tomorrow: Mapped[str] = mapped_column(Text, default="", nullable=False)
    rating: Mapped[int | None] = mapped_column(Integer, nullable=True)  # 1-10 day rating

    user: Mapped["User"] = relationship(backref="reflections")
