"""Org seat capacity + sponsorship endpoints.

  GET   /orgs/me/seats              snapshot: used / total / extra / sponsorship
  POST  /orgs/me/seats/checkout     {seats}  → Razorpay order at ₹5/seat
  POST  /orgs/me/seats/verify       {order_id, payment_id, signature}
                                    → verify HMAC, credit extra seats
  POST  /orgs/me/sponsorship        {enabled} → owner toggles sponsorship

Owner-only mutations; seats snapshot is visible to any member.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from typing import Literal

from fastapi import APIRouter, HTTPException, status
from loguru import logger
from pydantic import BaseModel, Field
from sqlalchemy import select

from app.api.deps import DBSession, OrgMember, OrgOwner
from app.core.config import settings
from app.models.membership import OrganizationMembership
from app.models.organization import Organization
from app.models.seat_purchase import SeatPurchase, SeatPurchaseStatus
from app.models.sponsorship_purchase import SponsorshipPurchase
from app.models.subscription import PlanCode, Subscription, SubscriptionStatus
from app.models.user import User
from app.services.access import org_seat_usage
from app.services.razorpay_client import (
    create_order,
    make_receipt,
    verify_payment_signature,
)

router = APIRouter(prefix="/orgs/me", tags=["organizations"])

PRICE_PER_SEAT_PAISE = 500  # ₹5
MAX_SEATS_PER_PURCHASE = 500  # sanity cap


class SeatsState(BaseModel):
    used: int
    total: int
    base_limit: int
    extra_purchased: int
    price_per_seat_paise: int
    sponsorship_enabled: bool


class BuySeatsRequest(BaseModel):
    seats: int = Field(..., ge=1, le=MAX_SEATS_PER_PURCHASE)


class BuySeatsResponse(BaseModel):
    order_id: str
    amount_paise: int
    currency: str = "INR"
    key_id: str
    seats: int


class VerifySeatsRequest(BaseModel):
    razorpay_order_id: str = Field(..., min_length=10)
    razorpay_payment_id: str = Field(..., min_length=10)
    razorpay_signature: str = Field(..., min_length=10)


class SponsorshipRequest(BaseModel):
    enabled: bool


@router.get("/seats", response_model=SeatsState)
async def seats_snapshot(user: OrgMember, db: DBSession) -> SeatsState:
    org = await db.get(Organization, user.org_id)
    if not org:
        raise HTTPException(404, "Org not found")
    used, total = await org_seat_usage(db, org.id)
    return SeatsState(
        used=used,
        total=total,
        base_limit=org.seat_limit,
        extra_purchased=org.extra_seats_purchased,
        price_per_seat_paise=PRICE_PER_SEAT_PAISE,
        sponsorship_enabled=org.sponsorship_enabled,
    )


@router.post("/seats/checkout", response_model=BuySeatsResponse)
async def buy_seats(
    payload: BuySeatsRequest, owner: OrgOwner, db: DBSession
) -> BuySeatsResponse:
    if not settings.razorpay_enabled:
        raise HTTPException(503, "Payments not configured")

    amount_paise = payload.seats * PRICE_PER_SEAT_PAISE

    org = await db.get(Organization, owner.org_id)
    if not org:
        raise HTTPException(404, "Org not found")

    order = await create_order(
        amount_paise=amount_paise,
        receipt=make_receipt("seats"),
        notes={
            "kind": "seats",
            "org_id": str(org.id),
            "buyer_user_id": str(owner.id),
            "seats": str(payload.seats),
        },
    )

    db.add(
        SeatPurchase(
            org_id=org.id,
            buyer_user_id=owner.id,
            seats_added=payload.seats,
            amount_paise=amount_paise,
            razorpay_order_id=order["id"],
            status=SeatPurchaseStatus.PENDING,
            created_at=datetime.now(timezone.utc),
        )
    )
    await db.commit()

    return BuySeatsResponse(
        order_id=order["id"],
        amount_paise=amount_paise,
        key_id=settings.RAZORPAY_KEY_ID,
        seats=payload.seats,
    )


@router.post("/seats/verify", response_model=SeatsState)
async def verify_seats(
    payload: VerifySeatsRequest, owner: OrgOwner, db: DBSession
) -> SeatsState:
    # 1. Find the pending purchase that matches this order_id.
    purchase = await db.scalar(
        select(SeatPurchase).where(
            SeatPurchase.razorpay_order_id == payload.razorpay_order_id,
            SeatPurchase.org_id == owner.org_id,
            SeatPurchase.buyer_user_id == owner.id,
        )
    )
    if not purchase:
        raise HTTPException(404, "Order not found for this org")

    # Idempotency: if already completed, just return the current state.
    if purchase.status == SeatPurchaseStatus.COMPLETED:
        org = await db.get(Organization, owner.org_id)
        used, total = await org_seat_usage(db, owner.org_id)
        return SeatsState(
            used=used,
            total=total,
            base_limit=org.seat_limit,
            extra_purchased=org.extra_seats_purchased,
            price_per_seat_paise=PRICE_PER_SEAT_PAISE,
            sponsorship_enabled=org.sponsorship_enabled,
        )

    # 2. HMAC signature check.
    if not verify_payment_signature(
        payload.razorpay_order_id,
        payload.razorpay_payment_id,
        payload.razorpay_signature,
    ):
        purchase.status = SeatPurchaseStatus.FAILED
        await db.commit()
        raise HTTPException(400, "Invalid payment signature")

    # 3. Credit the seats.
    org = await db.get(Organization, owner.org_id)
    if not org:
        raise HTTPException(404, "Org not found")

    org.extra_seats_purchased += purchase.seats_added
    purchase.status = SeatPurchaseStatus.COMPLETED
    purchase.razorpay_payment_id = payload.razorpay_payment_id
    purchase.completed_at = datetime.now(timezone.utc)

    await db.commit()
    logger.info(
        "Org {} added {} seats (now {} extra, {} total)",
        org.id,
        purchase.seats_added,
        org.extra_seats_purchased,
        org.seat_limit + org.extra_seats_purchased,
    )

    used, total = await org_seat_usage(db, org.id)
    return SeatsState(
        used=used,
        total=total,
        base_limit=org.seat_limit,
        extra_purchased=org.extra_seats_purchased,
        price_per_seat_paise=PRICE_PER_SEAT_PAISE,
        sponsorship_enabled=org.sponsorship_enabled,
    )


@router.post("/sponsorship")
async def toggle_sponsorship(
    payload: SponsorshipRequest, owner: OrgOwner, db: DBSession
) -> dict:
    """Cosmetic flag — kept for back-compat but no longer gates access.
    Real sponsorship now happens via /sponsorship/checkout (per-member)."""
    org = await db.get(Organization, owner.org_id)
    if not org:
        raise HTTPException(404, "Org not found")
    org.sponsorship_enabled = payload.enabled
    await db.commit()
    return {"ok": True, "sponsorship_enabled": org.sponsorship_enabled}


# --- Explicit per-member sponsorship purchase --------------------------------
#
# The owner picks specific members + a plan, pays plan_price × N members in a
# single Razorpay transaction, and each selected member's Subscription gets
# extended with sponsored_by_user_id / sponsored_by_org_id set.

# Mirror of /billing PLAN_CATALOG amounts — keep in sync if those change.
SPONSORABLE_PLANS: dict[str, dict] = {
    PlanCode.MONTHLY.value:    {"label": "Monthly",   "amount_paise":  4900, "duration_days":  30},
    PlanCode.SIX_MONTH.value:  {"label": "6 months",  "amount_paise": 24900, "duration_days": 182},
    PlanCode.YEARLY.value:     {"label": "1 year",    "amount_paise": 44900, "duration_days": 365},
}


class MemberSubInfo(BaseModel):
    user_id: str
    name: str
    email: str
    avatar_url: str | None
    org_role: str | None
    plan: str
    status: str
    expires_at: datetime
    days_left: int
    is_active: bool
    is_sponsored: bool
    sponsored_by_org_id: str | None


class SponsorMembersListResponse(BaseModel):
    members: list[MemberSubInfo]
    org_id: str


class SponsorshipCheckoutRequest(BaseModel):
    plan: Literal["monthly", "six_month", "yearly"]
    member_ids: list[uuid.UUID] = Field(..., min_length=1, max_length=500)


class SponsorshipCheckoutResponse(BaseModel):
    order_id: str
    amount_paise: int
    currency: str = "INR"
    key_id: str
    plan: str
    members_count: int


class SponsorshipVerifyRequest(BaseModel):
    razorpay_order_id: str = Field(..., min_length=10)
    razorpay_payment_id: str = Field(..., min_length=10)
    razorpay_signature: str = Field(..., min_length=10)


class SponsorshipVerifyResponse(BaseModel):
    ok: bool
    members_sponsored: int
    until: datetime


@router.get("/sponsorship/members", response_model=SponsorMembersListResponse)
async def list_members_for_sponsorship(
    owner: OrgOwner, db: DBSession
) -> SponsorMembersListResponse:
    """List every member of this org with their current subscription state,
    so the owner can pick who to sponsor."""
    rows = (
        await db.execute(
            select(User, OrganizationMembership)
            .join(OrganizationMembership, OrganizationMembership.user_id == User.id)
            .where(OrganizationMembership.org_id == owner.org_id)
            .order_by(OrganizationMembership.joined_at.asc())
        )
    ).all()

    now = datetime.now(timezone.utc)
    members: list[MemberSubInfo] = []
    for u, m in rows:
        sub = await db.get(Subscription, u.id)
        if sub is None:
            # Defensive — should never happen post-migration but render anyway.
            members.append(
                MemberSubInfo(
                    user_id=str(u.id),
                    name=u.name or u.email.split("@")[0],
                    email=u.email,
                    avatar_url=u.avatar_url,
                    org_role=m.role.value,
                    plan="trial",
                    status="expired",
                    expires_at=now,
                    days_left=0,
                    is_active=False,
                    is_sponsored=False,
                    sponsored_by_org_id=None,
                )
            )
            continue
        delta = sub.expires_at - now
        days_left = max(0, delta.days + (1 if delta.seconds > 0 else 0))
        is_active = sub.expires_at > now and sub.status in (
            SubscriptionStatus.TRIAL,
            SubscriptionStatus.ACTIVE,
        )
        members.append(
            MemberSubInfo(
                user_id=str(u.id),
                name=u.name or u.email.split("@")[0],
                email=u.email,
                avatar_url=u.avatar_url,
                org_role=m.role.value,
                plan=sub.plan.value,
                status=sub.status.value,
                expires_at=sub.expires_at,
                days_left=days_left,
                is_active=is_active,
                is_sponsored=sub.sponsored_by_user_id is not None,
                sponsored_by_org_id=str(sub.sponsored_by_org_id)
                if sub.sponsored_by_org_id
                else None,
            )
        )
    return SponsorMembersListResponse(members=members, org_id=str(owner.org_id))


@router.post("/sponsorship/checkout", response_model=SponsorshipCheckoutResponse)
async def sponsorship_checkout(
    payload: SponsorshipCheckoutRequest, owner: OrgOwner, db: DBSession
) -> SponsorshipCheckoutResponse:
    if not settings.razorpay_enabled:
        raise HTTPException(503, "Payments not configured")

    info = SPONSORABLE_PLANS.get(payload.plan)
    if not info:
        raise HTTPException(400, "Plan is not sponsorable")

    member_ids = list({mid for mid in payload.member_ids})  # dedup
    if not member_ids:
        raise HTTPException(400, "No members selected")

    # Verify every selected user is actually a member of this org.
    actual = (
        await db.scalars(
            select(OrganizationMembership.user_id).where(
                OrganizationMembership.org_id == owner.org_id,
                OrganizationMembership.user_id.in_(member_ids),
            )
        )
    ).all()
    actual_set = {str(uid) for uid in actual}
    if {str(m) for m in member_ids} - actual_set:
        raise HTTPException(400, "Some users are not members of this org")

    amount_paise = info["amount_paise"] * len(member_ids)

    order = await create_order(
        amount_paise=amount_paise,
        receipt=make_receipt("spons"),
        notes={
            "kind": "sponsorship",
            "org_id": str(owner.org_id),
            "buyer_user_id": str(owner.id),
            "plan": payload.plan,
            "members_count": str(len(member_ids)),
        },
    )

    db.add(
        SponsorshipPurchase(
            org_id=owner.org_id,
            buyer_user_id=owner.id,
            plan=PlanCode(payload.plan),
            member_ids=[str(m) for m in member_ids],
            members_count=len(member_ids),
            amount_paise=amount_paise,
            razorpay_order_id=order["id"],
            status=SeatPurchaseStatus.PENDING,
            created_at=datetime.now(timezone.utc),
        )
    )
    await db.commit()

    return SponsorshipCheckoutResponse(
        order_id=order["id"],
        amount_paise=amount_paise,
        key_id=settings.RAZORPAY_KEY_ID,
        plan=payload.plan,
        members_count=len(member_ids),
    )


@router.post("/sponsorship/verify", response_model=SponsorshipVerifyResponse)
async def sponsorship_verify(
    payload: SponsorshipVerifyRequest, owner: OrgOwner, db: DBSession
) -> SponsorshipVerifyResponse:
    purchase = await db.scalar(
        select(SponsorshipPurchase).where(
            SponsorshipPurchase.razorpay_order_id == payload.razorpay_order_id,
            SponsorshipPurchase.org_id == owner.org_id,
        )
    )
    if not purchase:
        raise HTTPException(404, "Order not found for this org")

    if purchase.status == SeatPurchaseStatus.COMPLETED:
        # Idempotent — return the previously-applied state.
        max_until = datetime.now(timezone.utc)
        return SponsorshipVerifyResponse(
            ok=True, members_sponsored=purchase.members_count, until=max_until
        )

    if not verify_payment_signature(
        payload.razorpay_order_id,
        payload.razorpay_payment_id,
        payload.razorpay_signature,
    ):
        purchase.status = SeatPurchaseStatus.FAILED
        await db.commit()
        raise HTTPException(400, "Invalid payment signature")

    info = SPONSORABLE_PLANS[purchase.plan.value]
    now = datetime.now(timezone.utc)
    extension = timedelta(days=info["duration_days"])

    max_until = now
    for mid in purchase.member_ids:
        try:
            member_uuid = uuid.UUID(mid)
        except ValueError:
            continue

        sub = await db.get(Subscription, member_uuid)
        if sub is None:
            sub = Subscription(
                user_id=member_uuid,
                plan=purchase.plan,
                status=SubscriptionStatus.ACTIVE,
                expires_at=now + extension,
                has_used_intro=False,
                last_payment_id=payload.razorpay_payment_id,
                last_amount_paise=info["amount_paise"],
                last_paid_at=now,
                sponsored_by_user_id=owner.id,
                sponsored_by_org_id=owner.org_id,
            )
            db.add(sub)
        else:
            base = sub.expires_at if sub.expires_at > now else now
            sub.expires_at = base + extension
            sub.plan = purchase.plan
            sub.status = SubscriptionStatus.ACTIVE
            sub.last_payment_id = payload.razorpay_payment_id
            sub.last_amount_paise = info["amount_paise"]
            sub.last_paid_at = now
            sub.sponsored_by_user_id = owner.id
            sub.sponsored_by_org_id = owner.org_id

        if sub.expires_at > max_until:
            max_until = sub.expires_at

    purchase.status = SeatPurchaseStatus.COMPLETED
    purchase.razorpay_payment_id = payload.razorpay_payment_id
    purchase.completed_at = now

    await db.commit()
    logger.info(
        "Sponsorship completed: org={} buyer={} plan={} members={} until={}",
        owner.org_id,
        owner.email,
        purchase.plan.value,
        purchase.members_count,
        max_until.isoformat(),
    )
    return SponsorshipVerifyResponse(
        ok=True, members_sponsored=purchase.members_count, until=max_until
    )
