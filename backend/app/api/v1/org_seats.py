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
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, status
from loguru import logger
from pydantic import BaseModel, Field
from sqlalchemy import select

from app.api.deps import DBSession, OrgMember, OrgOwner
from app.core.config import settings
from app.models.organization import Organization
from app.models.seat_purchase import SeatPurchase, SeatPurchaseStatus
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
    org = await db.get(Organization, owner.org_id)
    if not org:
        raise HTTPException(404, "Org not found")
    org.sponsorship_enabled = payload.enabled
    await db.commit()
    logger.info(
        "Sponsorship {} on org {} by owner {}",
        "enabled" if payload.enabled else "disabled",
        org.id,
        owner.email,
    )
    return {"ok": True, "sponsorship_enabled": org.sponsorship_enabled}
