import uuid
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models._mixins import TimestampMixin

if TYPE_CHECKING:
    from app.models.user import User


class Squad(Base, TimestampMixin):
    """A team / sub-room within an organization. Has its own leaderboard."""

    __tablename__ = "squads"
    __table_args__ = (UniqueConstraint("org_id", "name", name="uq_squad_org_name"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(80), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="", nullable=False)
    color: Mapped[str] = mapped_column(String(20), default="violet", nullable=False)
    emoji: Mapped[str] = mapped_column(String(8), default="⚔️", nullable=False)

    group_streak_mode: Mapped[bool] = mapped_column(default=False, nullable=False)
    streak: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    longest_streak: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    members: Mapped[list["SquadMember"]] = relationship(
        back_populates="squad", cascade="all, delete-orphan"
    )


class SquadMember(Base, TimestampMixin):
    __tablename__ = "squad_members"
    __table_args__ = (UniqueConstraint("squad_id", "user_id", name="uq_squad_member"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    squad_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("squads.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    role: Mapped[str] = mapped_column(String(20), default="member", nullable=False)

    squad: Mapped["Squad"] = relationship(back_populates="members")
    user: Mapped["User"] = relationship()
