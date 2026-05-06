import enum
import uuid
from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, Enum, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models._mixins import TimestampMixin

if TYPE_CHECKING:
    from app.models.user import User


class BuddyStatus(str, enum.Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    ENDED = "ended"


class BuddyPair(Base, TimestampMixin):
    """Accountability buddy pairing. Always stored as user_a < user_b (UUID order)
    to dedupe — see service for canonicalization."""

    __tablename__ = "buddy_pairs"
    __table_args__ = (
        UniqueConstraint("user_a", "user_b", name="uq_buddy_pair"),
        CheckConstraint("user_a <> user_b", name="ck_buddy_distinct"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_a: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_b: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    requested_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    status: Mapped[BuddyStatus] = mapped_column(
        Enum(BuddyStatus, name="buddy_status"),
        default=BuddyStatus.PENDING,
        nullable=False,
        index=True,
    )

    user_a_rel: Mapped["User"] = relationship(foreign_keys=[user_a])
    user_b_rel: Mapped["User"] = relationship(foreign_keys=[user_b])
