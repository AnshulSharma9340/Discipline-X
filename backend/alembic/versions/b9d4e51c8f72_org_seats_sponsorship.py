"""org seat capacity + sponsorship + seat_purchases table

Revision ID: b9d4e51c8f72
Revises: a8c7e2f04b91
Create Date: 2026-05-08 18:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "b9d4e51c8f72"
down_revision: Union[str, None] = "a8c7e2f04b91"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

DEFAULT_SEATS = 15


def upgrade() -> None:
    # New columns on organizations (server_default so backfill is automatic).
    op.add_column(
        "organizations",
        sa.Column("seat_limit", sa.Integer(), nullable=False, server_default=str(DEFAULT_SEATS)),
    )
    op.add_column(
        "organizations",
        sa.Column(
            "extra_seats_purchased", sa.Integer(), nullable=False, server_default="0"
        ),
    )
    op.add_column(
        "organizations",
        sa.Column(
            "sponsorship_enabled", sa.Boolean(), nullable=False, server_default=sa.text("false")
        ),
    )

    seat_status = postgresql.ENUM(
        "pending", "completed", "failed", name="seat_purchase_status", create_type=False
    )
    seat_status.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "seat_purchases",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("org_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("buyer_user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("seats_added", sa.Integer(), nullable=False),
        sa.Column("amount_paise", sa.Integer(), nullable=False),
        sa.Column("razorpay_order_id", sa.String(length=80), nullable=False, unique=True),
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
    op.create_index("ix_seat_purchases_org_id", "seat_purchases", ["org_id"])
    op.create_index("ix_seat_purchases_status", "seat_purchases", ["status"])


def downgrade() -> None:
    op.drop_index("ix_seat_purchases_status", table_name="seat_purchases")
    op.drop_index("ix_seat_purchases_org_id", table_name="seat_purchases")
    op.drop_table("seat_purchases")
    op.execute("DROP TYPE IF EXISTS seat_purchase_status")
    op.drop_column("organizations", "sponsorship_enabled")
    op.drop_column("organizations", "extra_seats_purchased")
    op.drop_column("organizations", "seat_limit")
