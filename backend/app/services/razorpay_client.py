"""Thin Razorpay HTTP client.

Razorpay's Python SDK is fine but adds a dependency. We only need 2 calls
(create order + verify signature) so we hit the REST API directly with httpx.
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import secrets
from typing import Any

import httpx

from app.core.config import settings

ORDERS_URL = "https://api.razorpay.com/v1/orders"


def _basic_auth() -> str:
    raw = f"{settings.RAZORPAY_KEY_ID}:{settings.RAZORPAY_KEY_SECRET}".encode()
    return "Basic " + base64.b64encode(raw).decode()


async def create_order(amount_paise: int, receipt: str, notes: dict[str, str]) -> dict[str, Any]:
    """Create an order in INR. Razorpay amounts are in paise (1 INR = 100 paise)."""
    if not settings.razorpay_enabled:
        raise RuntimeError("Razorpay not configured")

    payload = {
        "amount": amount_paise,
        "currency": "INR",
        "receipt": receipt[:40],  # Razorpay caps receipt at 40 chars
        "notes": notes,
    }
    headers = {
        "Authorization": _basic_auth(),
        "Content-Type": "application/json",
    }
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.post(ORDERS_URL, json=payload, headers=headers)
    if resp.status_code >= 300:
        raise RuntimeError(f"Razorpay create_order failed: {resp.status_code} {resp.text}")
    return resp.json()


def verify_payment_signature(order_id: str, payment_id: str, signature: str) -> bool:
    """Razorpay sends `razorpay_signature = HMAC_SHA256(order_id|payment_id, KEY_SECRET)`.
    We recompute and compare in constant time.
    """
    if not settings.RAZORPAY_KEY_SECRET:
        return False
    expected = hmac.new(
        settings.RAZORPAY_KEY_SECRET.encode(),
        f"{order_id}|{payment_id}".encode(),
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(expected, signature)


def verify_webhook_signature(body: bytes, signature: str) -> bool:
    """Razorpay sends `X-Razorpay-Signature: HMAC_SHA256(raw_body, WEBHOOK_SECRET)`."""
    secret = settings.RAZORPAY_WEBHOOK_SECRET
    if not secret:
        return False
    expected = hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)


def make_receipt(prefix: str = "dx") -> str:
    """Short opaque receipt id."""
    return f"{prefix}_{secrets.token_hex(8)}"
