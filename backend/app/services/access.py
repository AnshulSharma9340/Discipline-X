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

    With explicit per-member sponsorship, premium = "is your subscription
    live?". The Subscription row carries `sponsored_by_user_id` /
    `sponsored_by_org_id` if an org owner paid for it; that only changes
    the *source* label, not whether access is granted.
    """
    sub = await db.get(Subscription, user.id)
    if not _sub_is_live(sub):
        return PremiumStatus(active=False, source="none")

    if sub.sponsored_by_user_id is None:
        return PremiumStatus(active=True, source="personal")

    # Sponsored sub — look up the org name for friendly UI.
    org_name: str | None = None
    org_id_str: str | None = None
    if sub.sponsored_by_org_id is not None:
        org = await db.get(Organization, sub.sponsored_by_org_id)
        if org is not None:
            org_name = org.name
            org_id_str = str(org.id)

    return PremiumStatus(
        active=True,
        source="sponsored",
        sponsoring_org_id=org_id_str,
        sponsoring_org_name=org_name,
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
