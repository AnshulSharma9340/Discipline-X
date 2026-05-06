import uuid
from datetime import date
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, Date, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models._mixins import TimestampMixin

if TYPE_CHECKING:
    from app.models.user import User


class Habit(Base, TimestampMixin):
    """A recurring daily habit a user tracks (8h sleep, no scroll, gym, etc.)."""

    __tablename__ = "habits"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    name: Mapped[str] = mapped_column(String(80), nullable=False)
    icon: Mapped[str] = mapped_column(String(40), default="check", nullable=False)
    color: Mapped[str] = mapped_column(String(20), default="violet", nullable=False)
    target_per_week: Mapped[int] = mapped_column(Integer, default=7, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    user: Mapped["User"] = relationship(backref="habits")
    checks: Mapped[list["HabitCheck"]] = relationship(
        back_populates="habit", cascade="all, delete-orphan"
    )


class HabitCheck(Base, TimestampMixin):
    __tablename__ = "habit_checks"
    __table_args__ = (UniqueConstraint("habit_id", "date", name="uq_habit_date"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    habit_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("habits.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    done: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    habit: Mapped["Habit"] = relationship(back_populates="checks")
