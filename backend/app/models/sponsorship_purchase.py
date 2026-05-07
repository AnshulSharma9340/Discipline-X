"""Records of bulk sponsorship purchases — owner pays plan_price × N members."""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.seat_purchase import SeatPurchaseStatus
from app.models.subscription import PlanCode


class SponsorshipPurchase(Base):
    __tablename__ = "sponsorship_purchases"

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

    plan: Mapped[PlanCode] = mapped_column(
        Enum(PlanCode, name="plan_code", create_type=False, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
    )
    # Snapshot of which members were sponsored — JSONB list of UUID strings.
    member_ids: Mapped[list] = mapped_column(JSONB, nullable=False)
    members_count: Mapped[int] = mapped_column(Integer, nullable=False)

    amount_paise: Mapped[int] = mapped_column(Integer, nullable=False)
    razorpay_order_id: Mapped[str] = mapped_column(String(80), nullable=False, unique=True)
    razorpay_payment_id: Mapped[str | None] = mapped_column(String(80), nullable=True)

    status: Mapped[SeatPurchaseStatus] = mapped_column(
        Enum(SeatPurchaseStatus, name="seat_purchase_status", create_type=False, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
