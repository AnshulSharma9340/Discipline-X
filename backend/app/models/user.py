import enum
import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, Enum, Float, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models._mixins import TimestampMixin
from app.models.organization import OrgRole

if TYPE_CHECKING:
    from app.models.analytics import DailyAnalytics
    from app.models.emergency import EmergencyRequest
    from app.models.organization import Organization
    from app.models.submission import TaskSubmission
    from app.models.task import DailyTask


class UserRole(str, enum.Enum):
    USER = "user"
    MODERATOR = "moderator"
    ADMIN = "admin"


class AccessStatus(str, enum.Enum):
    ACTIVE = "active"
    LOCKED = "locked"
    EMERGENCY_UNLOCKED = "emergency_unlocked"


class User(Base, TimestampMixin):
    __tablename__ = "users"

    # Supabase auth user UUID — same as auth.users.id in Supabase
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)

    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False, default="")
    avatar_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, name="user_role"),
        default=UserRole.USER,
        nullable=False,
        index=True,
    )
    access_status: Mapped[AccessStatus] = mapped_column(
        Enum(AccessStatus, name="access_status"),
        default=AccessStatus.ACTIVE,
        nullable=False,
        index=True,
    )

    discipline_score: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    productivity_score: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    xp: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    streak: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    longest_streak: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    level: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    freeze_tokens: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    bio: Mapped[str] = mapped_column(String(280), default="", nullable=False)
    theme: Mapped[str] = mapped_column(String(40), default="violet", nullable=False)
    unlocked_themes: Mapped[str] = mapped_column(
        String(400), default="violet", nullable=False
    )
    inventory: Mapped[str] = mapped_column(String(800), default="", nullable=False)
    active_title: Mapped[str] = mapped_column(String(40), default="", nullable=False)
    active_frame: Mapped[str] = mapped_column(String(40), default="", nullable=False)
    xp_boost_until: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    xp_boost_multiplier: Mapped[float] = mapped_column(
        Float, default=1.0, nullable=False
    )

    last_active_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    locked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Organization membership (multi-tenancy). Nullable until the user joins/creates an org.
    org_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    org_role: Mapped[OrgRole | None] = mapped_column(
        Enum(OrgRole, name="org_role"), nullable=True
    )

    organization: Mapped["Organization | None"] = relationship(
        back_populates="members", foreign_keys=[org_id]
    )

    submissions: Mapped[list["TaskSubmission"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
        foreign_keys="TaskSubmission.user_id",
    )
    emergency_requests: Mapped[list["EmergencyRequest"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
        foreign_keys="EmergencyRequest.user_id",
    )
    analytics: Mapped[list["DailyAnalytics"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )
    created_tasks: Mapped[list["DailyTask"]] = relationship(
        back_populates="creator",
        foreign_keys="DailyTask.created_by",
    )

    def __repr__(self) -> str:
        return f"<User {self.email} role={self.role.value}>"
