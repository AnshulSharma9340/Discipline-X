import enum
import secrets
import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models._mixins import TimestampMixin

if TYPE_CHECKING:
    from app.models.user import User


class OrgRole(str, enum.Enum):
    """Per-organization permission level. Decoupled from the legacy global User.role."""

    OWNER = "owner"        # created the org, full powers
    MODERATOR = "moderator"  # can verify submissions, manage tasks
    MEMBER = "member"      # regular user


def generate_invite_code() -> str:
    """Short shareable code: e.g. 'X7K-9PM-2QV'."""
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"  # no confusing chars
    parts = ["".join(secrets.choice(alphabet) for _ in range(3)) for _ in range(3)]
    return "-".join(parts)


class Organization(Base, TimestampMixin):
    """A leader's room. Tasks, submissions, leaderboards are scoped to one org."""

    __tablename__ = "organizations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(80), nullable=False)
    slug: Mapped[str] = mapped_column(String(80), unique=True, nullable=False, index=True)
    description: Mapped[str] = mapped_column(Text, default="", nullable=False)
    invite_code: Mapped[str] = mapped_column(
        String(20), unique=True, nullable=False, default=generate_invite_code, index=True
    )
    is_open: Mapped[bool] = mapped_column(
        Boolean, default=True, nullable=False
    )  # if False, only invite code works (always true for now; future: applications)

    # Seat capacity — total members allowed = seat_limit + extra_seats_purchased.
    # Default is 15; owners can buy more at ₹5/seat via Razorpay (one-time).
    seat_limit: Mapped[int] = mapped_column(Integer, default=15, nullable=False)
    extra_seats_purchased: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # When true, members of this org get premium access regardless of their
    # personal subscription — provided the OWNER has an active personal
    # subscription. The owner's payment funds the sponsorship.
    sponsorship_enabled: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False
    )

    owner_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )

    members: Mapped[list["User"]] = relationship(
        back_populates="organization", foreign_keys="User.org_id"
    )
