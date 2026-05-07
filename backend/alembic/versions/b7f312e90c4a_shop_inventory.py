"""shop inventory + boosters + titles

Revision ID: b7f312e90c4a
Revises: 1f9685e12750
Create Date: 2026-05-07 12:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'b7f312e90c4a'
down_revision: Union[str, None] = '1f9685e12750'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'users',
        sa.Column('inventory', sa.String(length=800), nullable=False, server_default=''),
    )
    op.add_column(
        'users',
        sa.Column('active_title', sa.String(length=40), nullable=False, server_default=''),
    )
    op.add_column(
        'users',
        sa.Column('active_frame', sa.String(length=40), nullable=False, server_default=''),
    )
    op.add_column(
        'users',
        sa.Column('xp_boost_until', sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        'users',
        sa.Column(
            'xp_boost_multiplier',
            sa.Float(),
            nullable=False,
            server_default='1.0',
        ),
    )


def downgrade() -> None:
    op.drop_column('users', 'xp_boost_multiplier')
    op.drop_column('users', 'xp_boost_until')
    op.drop_column('users', 'active_frame')
    op.drop_column('users', 'active_title')
    op.drop_column('users', 'inventory')
