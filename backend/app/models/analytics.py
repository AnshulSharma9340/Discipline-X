import uuid
from datetime import date

from sqlalchemy import Date, ForeignKey, Integer, Numeric, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models._mixins import TimestampMixin
from app.models.user import User


class DailyAnalytics(Base, TimestampMixin):
    """Per-user daily rollup. One row per (user, date)."""

    __tablename__ = "daily_analytics"
    __table_args__ = (UniqueConstraint("user_id", "date", name="uq_user_date"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    date: Mapped[date] = mapped_column(Date, nullable=False, index=True)

    tasks_assigned: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    tasks_submitted: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    tasks_approved: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    tasks_rejected: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    productivity_score: Mapped[float] = mapped_column(Numeric(6, 2), default=0, nullable=False)
    discipline_score: Mapped[float] = mapped_column(Numeric(6, 2), default=0, nullable=False)
    focus_score: Mapped[float] = mapped_column(Numeric(6, 2), default=0, nullable=False)

    study_minutes: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    points_earned: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    user: Mapped["User"] = relationship(back_populates="analytics")
