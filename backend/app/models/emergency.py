import enum
import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Enum, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models._mixins import TimestampMixin

if TYPE_CHECKING:
    from app.models.user import User


class EmergencyStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class EmergencyRequest(Base, TimestampMixin):
    __tablename__ = "emergency_requests"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    reason: Mapped[str] = mapped_column(Text, nullable=False)
    proof_path: Mapped[str | None] = mapped_column(String(500), nullable=True)

    status: Mapped[EmergencyStatus] = mapped_column(
        Enum(EmergencyStatus, name="emergency_status"),
        default=EmergencyStatus.PENDING,
        nullable=False,
        index=True,
    )

    admin_response: Mapped[str] = mapped_column(Text, default="", nullable=False)
    reviewed_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    unlock_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    user: Mapped["User"] = relationship(back_populates="emergency_requests", foreign_keys=[user_id])
