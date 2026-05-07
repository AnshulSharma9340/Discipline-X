"""organization_memberships table — many-to-many users ↔ orgs

Revision ID: f4a2b1c83d29
Revises: d3f17a920bb1
Create Date: 2026-05-08 14:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "f4a2b1c83d29"
down_revision: Union[str, None] = "d3f17a920bb1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Reuse the existing 'org_role' enum already created with the users table.
    org_role = postgresql.ENUM(
        "owner", "moderator", "member", name="org_role", create_type=False
    )

    op.create_table(
        "organization_memberships",
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("org_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("role", org_role, nullable=False),
        sa.Column(
            "joined_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("user_id", "org_id", name="pk_org_membership"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["org_id"], ["organizations.id"], ondelete="CASCADE"),
    )
    op.create_index(
        "ix_organization_memberships_user_id", "organization_memberships", ["user_id"]
    )
    op.create_index(
        "ix_organization_memberships_org_id", "organization_memberships", ["org_id"]
    )

    # Backfill: every existing user with an active org becomes a member.
    op.execute(
        """
        INSERT INTO organization_memberships (user_id, org_id, role, joined_at)
        SELECT u.id, u.org_id, u.org_role, u.created_at
          FROM users u
         WHERE u.org_id IS NOT NULL
           AND u.org_role IS NOT NULL
        ON CONFLICT (user_id, org_id) DO NOTHING
        """
    )


def downgrade() -> None:
    op.drop_index("ix_organization_memberships_org_id", table_name="organization_memberships")
    op.drop_index("ix_organization_memberships_user_id", table_name="organization_memberships")
    op.drop_table("organization_memberships")
