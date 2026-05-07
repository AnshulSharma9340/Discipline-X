"""subscriptions table — billing and trial state per user

Revision ID: a8c7e2f04b91
Revises: f4a2b1c83d29
Create Date: 2026-05-08 16:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "a8c7e2f04b91"
down_revision: Union[str, None] = "f4a2b1c83d29"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Define ENUMs with create_type=False — the explicit .create() below
    # produces them once; passing them into create_table won't try again.
    plan_code = postgresql.ENUM(
        "trial", "first_month", "monthly", "six_month", "yearly",
        name="plan_code",
        create_type=False,
    )
    sub_status = postgresql.ENUM(
        "trial", "active", "expired", "cancelled",
        name="subscription_status",
        create_type=False,
    )
    bind = op.get_bind()
    plan_code.create(bind, checkfirst=True)
    sub_status.create(bind, checkfirst=True)

    op.create_table(
        "subscriptions",
        sa.Column("user_id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("plan", plan_code, nullable=False, server_default="trial"),
        sa.Column("status", sub_status, nullable=False, server_default="trial"),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "has_used_intro", sa.Boolean(), nullable=False, server_default=sa.text("false")
        ),
        sa.Column("last_payment_id", sa.String(length=80), nullable=True),
        sa.Column("last_amount_paise", sa.Integer(), nullable=True),
        sa.Column("last_paid_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_subscriptions_status", "subscriptions", ["status"])
    op.create_index("ix_subscriptions_expires_at", "subscriptions", ["expires_at"])

    # Backfill: every existing user gets a trial that started at signup so
    # nobody is locked out the moment the gate ships. Trial length is the
    # same 7 days the new-user signup flow uses.
    op.execute(
        """
        INSERT INTO subscriptions (user_id, plan, status, expires_at, created_at, updated_at)
        SELECT id, 'trial', 'trial',
               GREATEST(NOW() + INTERVAL '7 days', created_at + INTERVAL '7 days'),
               NOW(), NOW()
          FROM users
        ON CONFLICT (user_id) DO NOTHING
        """
    )


def downgrade() -> None:
    op.drop_index("ix_subscriptions_expires_at", table_name="subscriptions")
    op.drop_index("ix_subscriptions_status", table_name="subscriptions")
    op.drop_table("subscriptions")
    op.execute("DROP TYPE IF EXISTS subscription_status")
    op.execute("DROP TYPE IF EXISTS plan_code")
