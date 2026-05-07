"""explicit per-member sponsorship — sponsored_by_* + sponsorship_purchases

Revision ID: c1e5d8a91234
Revises: b9d4e51c8f72
Create Date: 2026-05-08 19:30:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "c1e5d8a91234"
down_revision: Union[str, None] = "b9d4e51c8f72"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Subscription gets two FKs that record who funded it. NULL = self-paid.
    op.add_column(
        "subscriptions",
        sa.Column("sponsored_by_user_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.add_column(
        "subscriptions",
        sa.Column("sponsored_by_org_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_foreign_key(
        "fk_subscriptions_sponsored_by_user",
        "subscriptions",
        "users",
        ["sponsored_by_user_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_foreign_key(
        "fk_subscriptions_sponsored_by_org",
        "subscriptions",
        "organizations",
        ["sponsored_by_org_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index(
        "ix_subscriptions_sponsored_by_user",
        "subscriptions",
        ["sponsored_by_user_id"],
    )

    # sponsorship_purchases — one row per Razorpay sponsor-buy. Reuse the
    # plan_code and seat_purchase_status enums already in the DB.
    plan_code = postgresql.ENUM(
        "trial", "first_month", "monthly", "six_month", "yearly",
        name="plan_code",
        create_type=False,
    )
    seat_status = postgresql.ENUM(
        "pending", "completed", "failed",
        name="seat_purchase_status",
        create_type=False,
    )

    op.create_table(
        "sponsorship_purchases",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("org_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("buyer_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("plan", plan_code, nullable=False),
        sa.Column("member_ids", postgresql.JSONB, nullable=False),
        sa.Column("members_count", sa.Integer(), nullable=False),
        sa.Column("amount_paise", sa.Integer(), nullable=False),
        sa.Column("razorpay_order_id", sa.String(length=80), unique=True, nullable=False),
        sa.Column("razorpay_payment_id", sa.String(length=80), nullable=True),
        sa.Column("status", seat_status, nullable=False, server_default="pending"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["org_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["buyer_user_id"], ["users.id"], ondelete="SET NULL"),
    )
    op.create_index(
        "ix_sponsorship_purchases_org_id", "sponsorship_purchases", ["org_id"]
    )


def downgrade() -> None:
    op.drop_index("ix_sponsorship_purchases_org_id", table_name="sponsorship_purchases")
    op.drop_table("sponsorship_purchases")
    op.drop_index("ix_subscriptions_sponsored_by_user", table_name="subscriptions")
    op.drop_constraint("fk_subscriptions_sponsored_by_org", "subscriptions", type_="foreignkey")
    op.drop_constraint("fk_subscriptions_sponsored_by_user", "subscriptions", type_="foreignkey")
    op.drop_column("subscriptions", "sponsored_by_org_id")
    op.drop_column("subscriptions", "sponsored_by_user_id")
