"""shielded dates for streak protection

Revision ID: c8a134d52e91
Revises: b7f312e90c4a
Create Date: 2026-05-07 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'c8a134d52e91'
down_revision: Union[str, None] = 'b7f312e90c4a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # CSV of ISO dates (YYYY-MM-DD) the user has spent freeze tokens to protect.
    # Used by recompute_streak so a one-time shield consumption isn't repeated
    # on subsequent recomputes.
    op.add_column(
        'users',
        sa.Column(
            'shielded_dates',
            sa.String(length=2000),
            nullable=False,
            server_default='',
        ),
    )


def downgrade() -> None:
    op.drop_column('users', 'shielded_dates')
