"""User subscription state — what plan they're on and when it expires."""

import enum
import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models._mixins import TimestampMixin


class PlanCode(str, enum.Enum):
    TRIAL = "trial"
    FIRST_MONTH = "first_month"  # ₹1 intro
    MONTHLY = "monthly"           # ₹49
    SIX_MONTH = "six_month"       # ₹249
    YEARLY = "yearly"             # ₹449


class SubscriptionStatus(str, enum.Enum):
    TRIAL = "trial"        # in 7-day free trial
    ACTIVE = "active"      # paid and current
    EXPIRED = "expired"    # trial or paid period ran out
    CANCELLED = "cancelled"


class Subscription(Base, TimestampMixin):
    __tablename__ = "subscriptions"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
    )

    plan: Mapped[PlanCode] = mapped_column(
        # values_callable: serialize using `.value` (lowercase) instead of
        # the enum member name. Matches the lowercase DB enum we created
        # in the migration; without this, asyncpg rejects "TRIAL" as
        # invalid for plan_code.
        Enum(PlanCode, name="plan_code", values_callable=lambda x: [e.value for e in x]),
        default=PlanCode.TRIAL,
        nullable=False,
    )
    status: Mapped[SubscriptionStatus] = mapped_column(
        Enum(
            SubscriptionStatus,
            name="subscription_status",
            values_callable=lambda x: [e.value for e in x],
        ),
        default=SubscriptionStatus.TRIAL,
        nullable=False,
        index=True,
    )

    # When the current period ends — used for both trial and paid plans.
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True
    )

    # Whether the user has already redeemed the ₹1 first-month deal.
    has_used_intro: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Razorpay bookkeeping for the most recent successful payment.
    last_payment_id: Mapped[str | None] = mapped_column(String(80), nullable=True)
    last_amount_paise: Mapped[int | None] = mapped_column(Integer, nullable=True)
    last_paid_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
