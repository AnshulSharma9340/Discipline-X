"""Premium access gating — combines personal subscriptions with the
optional organization sponsorship layer.

Use these helpers from any endpoint that needs to gate paid features.
Currently the trial banner / topbar pill consume the result via the
extended /billing/me response.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Literal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.organization import Organization
from app.models.subscription import Subscription, SubscriptionStatus
from app.models.user import User

PremiumSource = Literal["personal", "sponsored", "none"]


@dataclass
class PremiumStatus:
    active: bool
    source: PremiumSource
    sponsoring_org_id: str | None = None
    sponsoring_org_name: str | None = None


def _sub_is_live(sub: Subscription | None) -> bool:
    if sub is None:
        return False
    if sub.status not in (SubscriptionStatus.TRIAL, SubscriptionStatus.ACTIVE):
        return False
    return sub.expires_at > datetime.now(timezone.utc)


async def get_premium_status(db: AsyncSession, user: User) -> PremiumStatus:
    """Resolve whether the given user currently has premium access.

    Order of precedence:
      1. Personal subscription is live (trial OR paid) → "personal".
      2. Active org has sponsorship_enabled AND that org's owner has a live
         personal sub → "sponsored".
      3. Neither → "none".
    """
    # 1) Personal sub
    own_sub = await db.get(Subscription, user.id)
    if _sub_is_live(own_sub):
        return PremiumStatus(active=True, source="personal")

    # 2) Sponsored?
    if user.org_id is None:
        return PremiumStatus(active=False, source="none")

    org = await db.get(Organization, user.org_id)
    if org is None or not org.sponsorship_enabled:
        return PremiumStatus(active=False, source="none")

    # If the user IS the owner, fall back to their own (already-checked) sub.
    # Members get covered by the OWNER's payment, not their own.
    owner_sub = await db.get(Subscription, org.owner_id)
    if not _sub_is_live(owner_sub):
        return PremiumStatus(active=False, source="none")

    return PremiumStatus(
        active=True,
        source="sponsored",
        sponsoring_org_id=str(org.id),
        sponsoring_org_name=org.name,
    )


async def org_seat_usage(db: AsyncSession, org_id) -> tuple[int, int]:
    """Return (used_seats, total_seats) for the given org."""
    from app.models.membership import OrganizationMembership
    from sqlalchemy import func

    org = await db.get(Organization, org_id)
    if org is None:
        return (0, 0)
    used = await db.scalar(
        select(func.count())
        .select_from(OrganizationMembership)
        .where(OrganizationMembership.org_id == org_id)
    ) or 0
    total = org.seat_limit + org.extra_seats_purchased
    return (int(used), int(total))
