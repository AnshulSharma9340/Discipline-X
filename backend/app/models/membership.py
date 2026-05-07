"""Many-to-many user ↔ organization with a role per membership.

Allows a single user to belong to multiple organizations. The user's
"currently active" org is still tracked via `User.org_id` / `User.org_role`
so every existing org-scoped endpoint keeps working unchanged.
"""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, PrimaryKeyConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.organization import OrgRole


class OrganizationMembership(Base):
    __tablename__ = "organization_memberships"
    __table_args__ = (PrimaryKeyConstraint("user_id", "org_id", name="pk_org_membership"),)

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    org_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    role: Mapped[OrgRole] = mapped_column(
        Enum(OrgRole, name="org_role", create_type=False),
        nullable=False,
    )
    joined_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
