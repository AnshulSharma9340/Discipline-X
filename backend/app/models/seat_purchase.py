"""Records of org-seat purchases via Razorpay.

Each successful purchase increments the parent org's
`extra_seats_purchased` counter. We keep the row around for audit.
"""

import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column


class SeatPurchaseStatus(str, enum.Enum):
    PENDING = "pending"     # order created, not yet paid
    COMPLETED = "completed" # signature verified, seats credited
    FAILED = "failed"       # payment dropped or signature mismatch


from app.core.database import Base


class SeatPurchase(Base):
    __tablename__ = "seat_purchases"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    org_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    buyer_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    seats_added: Mapped[int] = mapped_column(Integer, nullable=False)
    amount_paise: Mapped[int] = mapped_column(Integer, nullable=False)

    razorpay_order_id: Mapped[str] = mapped_column(String(80), nullable=False, unique=True)
    razorpay_payment_id: Mapped[str | None] = mapped_column(String(80), nullable=True)

    status: Mapped[SeatPurchaseStatus] = mapped_column(
        Enum(
            SeatPurchaseStatus,
            name="seat_purchase_status",
            values_callable=lambda x: [e.value for e in x],
        ),
        default=SeatPurchaseStatus.PENDING,
        nullable=False,
        index=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
