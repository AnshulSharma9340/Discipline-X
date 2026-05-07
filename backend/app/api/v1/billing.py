"""Subscription / billing endpoints — Razorpay-backed.

Flow:
  GET  /billing/me                       → current subscription state for trial banner
  GET  /billing/plans                    → list plan options (price + duration + availability)
  POST /billing/checkout {plan}          → create Razorpay order, return order_id + amount + key_id
                                            for the frontend Checkout overlay
  POST /billing/verify   {order_id, payment_id, signature, plan}
                                          → verify HMAC, extend the user's expires_at
  POST /billing/webhook                  → Razorpay calls this on payment.captured /
                                            payment.failed (defense-in-depth)
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Literal

from fastapi import APIRouter, HTTPException, Request, status
from loguru import logger
from pydantic import BaseModel, Field
from sqlalchemy import select

from app.api.deps import CurrentUser, DBSession
from app.core.config import settings
from app.models.subscription import PlanCode, Subscription, SubscriptionStatus
from app.services.razorpay_client import (
    create_order,
    make_receipt,
    verify_payment_signature,
    verify_webhook_signature,
)

router = APIRouter(prefix="/billing", tags=["billing"])


# --- Plan catalog ----------------------------------------------------------

PLAN_CATALOG: dict[str, dict] = {
    PlanCode.FIRST_MONTH.value: {
        "label": "₹0 first month",
        "amount_paise": 0,           # ₹0 — bypasses Razorpay, redeemed via /redeem-intro
        "duration_days": 30,
        "description": "After your 7-day trial — get 30 more days for ₹0. No card needed.",
        "intro_only": True,
    },
    PlanCode.MONTHLY.value: {
        "label": "Monthly",
        "amount_paise": 4900,       # ₹49
        "duration_days": 30,
        "description": "₹49 / month",
        "intro_only": False,
    },
    PlanCode.SIX_MONTH.value: {
        "label": "6 months",
        "amount_paise": 24900,      # ₹249
        "duration_days": 182,
        "description": "₹249 — save ₹45 vs monthly",
        "intro_only": False,
    },
    PlanCode.YEARLY.value: {
        "label": "1 year",
        "amount_paise": 44900,      # ₹449
        "duration_days": 365,
        "description": "₹449 — best value, save ₹139 vs monthly",
        "intro_only": False,
    },
}


# --- Schemas ---------------------------------------------------------------

class SubscriptionState(BaseModel):
    plan: str
    status: str
    expires_at: datetime
    days_left: int
    is_active: bool
    has_used_intro: bool


class CheckoutRequest(BaseModel):
    plan: Literal["first_month", "monthly", "six_month", "yearly"]


class CheckoutResponse(BaseModel):
    order_id: str
    amount_paise: int
    currency: str = "INR"
    key_id: str
    plan: str


class VerifyRequest(BaseModel):
    razorpay_order_id: str = Field(..., min_length=10)
    razorpay_payment_id: str = Field(..., min_length=10)
    razorpay_signature: str = Field(..., min_length=10)
    plan: Literal["first_month", "monthly", "six_month", "yearly"]


# --- Helpers ---------------------------------------------------------------

async def _get_or_create_sub(db, user) -> Subscription:
    sub = await db.get(Subscription, user.id)
    if sub:
        return sub
    sub = Subscription(
        user_id=user.id,
        plan=PlanCode.TRIAL,
        status=SubscriptionStatus.TRIAL,
        expires_at=datetime.now(timezone.utc) + timedelta(days=settings.TRIAL_DAYS),
    )
    db.add(sub)
    await db.flush()
    return sub


def _state(sub: Subscription) -> SubscriptionState:
    now = datetime.now(timezone.utc)
    delta = sub.expires_at - now
    days_left = max(0, delta.days + (1 if delta.seconds > 0 else 0))
    is_active = sub.expires_at > now and sub.status in (
        SubscriptionStatus.TRIAL,
        SubscriptionStatus.ACTIVE,
    )
    return SubscriptionState(
        plan=sub.plan.value,
        status=sub.status.value,
        expires_at=sub.expires_at,
        days_left=days_left,
        is_active=is_active,
        has_used_intro=sub.has_used_intro,
    )


# --- Endpoints -------------------------------------------------------------


@router.get("/me", response_model=SubscriptionState)
async def my_subscription(user: CurrentUser, db: DBSession) -> SubscriptionState:
    sub = await _get_or_create_sub(db, user)
    await db.commit()
    return _state(sub)


@router.get("/plans")
async def list_plans(user: CurrentUser, db: DBSession) -> dict:
    sub = await _get_or_create_sub(db, user)
    await db.commit()
    plans = []
    for code, info in PLAN_CATALOG.items():
        # First-month deal is hidden once a user has redeemed it.
        if info["intro_only"] and sub.has_used_intro:
            continue
        plans.append(
            {
                "code": code,
                "label": info["label"],
                "description": info["description"],
                "amount_paise": info["amount_paise"],
                "amount_inr": info["amount_paise"] / 100,
                "duration_days": info["duration_days"],
            }
        )
    return {"plans": plans, "subscription": _state(sub).model_dump(mode="json")}


@router.post("/checkout", response_model=CheckoutResponse)
async def start_checkout(
    payload: CheckoutRequest, user: CurrentUser, db: DBSession
) -> CheckoutResponse:
    info = PLAN_CATALOG.get(payload.plan)
    if not info:
        raise HTTPException(400, "Unknown plan")

    if info["amount_paise"] <= 0:
        # Free plans (₹0 intro) can't go through Razorpay — minimum is 1 INR.
        # Frontend should call /redeem-intro instead.
        raise HTTPException(400, "Use /redeem-intro for free plans")

    if not settings.razorpay_enabled:
        raise HTTPException(503, "Payments not configured")

    sub = await _get_or_create_sub(db, user)
    if info["intro_only"] and sub.has_used_intro:
        raise HTTPException(409, "Intro pricing already redeemed")

    order = await create_order(
        amount_paise=info["amount_paise"],
        receipt=make_receipt(),
        notes={"user_id": str(user.id), "plan": payload.plan, "email": user.email},
    )
    await db.commit()
    return CheckoutResponse(
        order_id=order["id"],
        amount_paise=info["amount_paise"],
        key_id=settings.RAZORPAY_KEY_ID,
        plan=payload.plan,
    )


@router.post("/redeem-intro", response_model=SubscriptionState)
async def redeem_intro(user: CurrentUser, db: DBSession) -> SubscriptionState:
    """Claim the one-time free intro month. No payment, no Razorpay — just
    extends the subscription's expires_at. Single-use per user (gated by
    has_used_intro)."""
    info = PLAN_CATALOG[PlanCode.FIRST_MONTH.value]
    if info["amount_paise"] > 0:
        # Catalog has been changed back to a paid intro — force payment flow.
        raise HTTPException(409, "Intro is no longer free — use /checkout")

    sub = await _get_or_create_sub(db, user)
    if sub.has_used_intro:
        raise HTTPException(409, "Intro pricing already redeemed")

    now = datetime.now(timezone.utc)
    base = sub.expires_at if sub.expires_at > now else now
    sub.expires_at = base + timedelta(days=info["duration_days"])
    sub.plan = PlanCode.FIRST_MONTH
    sub.status = SubscriptionStatus.ACTIVE
    sub.has_used_intro = True
    sub.last_paid_at = now
    sub.last_amount_paise = 0
    sub.last_payment_id = None

    await db.commit()
    logger.info("Free intro redeemed for {} until {}", user.email, sub.expires_at.isoformat())
    return _state(sub)


@router.post("/verify")
async def verify_payment(
    payload: VerifyRequest, user: CurrentUser, db: DBSession
) -> SubscriptionState:
    if not verify_payment_signature(
        payload.razorpay_order_id,
        payload.razorpay_payment_id,
        payload.razorpay_signature,
    ):
        raise HTTPException(400, "Invalid payment signature")

    info = PLAN_CATALOG[payload.plan]
    sub = await _get_or_create_sub(db, user)

    now = datetime.now(timezone.utc)
    # If the existing subscription is still active, stack the new period on top.
    base = sub.expires_at if sub.expires_at > now else now
    sub.expires_at = base + timedelta(days=info["duration_days"])
    sub.plan = PlanCode(payload.plan)
    sub.status = SubscriptionStatus.ACTIVE
    sub.last_payment_id = payload.razorpay_payment_id
    sub.last_amount_paise = info["amount_paise"]
    sub.last_paid_at = now
    if payload.plan == PlanCode.FIRST_MONTH.value:
        sub.has_used_intro = True

    await db.commit()
    logger.info(
        "Subscription extended for {} → {} until {}",
        user.email,
        payload.plan,
        sub.expires_at.isoformat(),
    )
    return _state(sub)


@router.post("/webhook", status_code=status.HTTP_200_OK)
async def razorpay_webhook(request: Request, db: DBSession) -> dict:
    """Defense-in-depth: even if the frontend never calls /verify, this fires
    when Razorpay confirms the capture, so we still extend the subscription.
    """
    raw = await request.body()
    signature = request.headers.get("X-Razorpay-Signature", "")
    if not verify_webhook_signature(raw, signature):
        raise HTTPException(401, "Invalid webhook signature")

    payload = await request.json()
    event = payload.get("event")
    if event != "payment.captured":
        # We only act on captured payments. Failures are logged client-side.
        return {"ok": True, "ignored": event}

    payment = (payload.get("payload") or {}).get("payment", {}).get("entity", {})
    notes = payment.get("notes") or {}
    user_id = notes.get("user_id")
    plan = notes.get("plan")
    payment_id = payment.get("id")

    if not user_id or not plan or plan not in PLAN_CATALOG:
        logger.warning("Webhook missing user_id/plan in notes: {}", notes)
        return {"ok": True, "ignored": "missing-notes"}

    sub = await db.get(Subscription, user_id)
    if not sub:
        logger.warning("Webhook for unknown user_id={}", user_id)
        return {"ok": True, "ignored": "unknown-user"}

    # Idempotency: if we already recorded this payment_id, don't extend twice.
    if sub.last_payment_id == payment_id:
        return {"ok": True, "duplicate": True}

    info = PLAN_CATALOG[plan]
    now = datetime.now(timezone.utc)
    base = sub.expires_at if sub.expires_at > now else now
    sub.expires_at = base + timedelta(days=info["duration_days"])
    sub.plan = PlanCode(plan)
    sub.status = SubscriptionStatus.ACTIVE
    sub.last_payment_id = payment_id
    sub.last_amount_paise = info["amount_paise"]
    sub.last_paid_at = now
    if plan == PlanCode.FIRST_MONTH.value:
        sub.has_used_intro = True

    await db.commit()
    logger.info("Webhook applied: {} → {} until {}", user_id, plan, sub.expires_at.isoformat())
    return {"ok": True}
