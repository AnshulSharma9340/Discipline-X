"""Backend-driven email OTP sign-in via Brevo.

Flow:
  1. POST /auth/otp/request {email}     → generate 6-digit code, store hash,
                                           email it via Brevo
  2. POST /auth/otp/verify  {email,code}→ verify hash, mint a Supabase magic
                                           link via admin API, return its URL
                                           so the frontend can navigate to it.
"""

from __future__ import annotations

import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException, status
from loguru import logger
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import delete, select

from app.api.deps import DBSession
from app.core.config import settings
from app.models.otp_code import OtpCode
from app.services.email import EmailError, send_otp_code
from app.services.supabase_admin import ensure_user, generate_magic_link

router = APIRouter(prefix="/auth/otp", tags=["auth"])

OTP_TTL_MINUTES = 10
MAX_ATTEMPTS = 3


def _hash_code(code: str) -> str:
    return hashlib.sha256(code.encode("utf-8")).hexdigest()


class OtpRequest(BaseModel):
    email: EmailStr


class OtpVerify(BaseModel):
    email: EmailStr
    code: str = Field(min_length=6, max_length=6, pattern=r"^\d{6}$")


class OtpVerifyResponse(BaseModel):
    action_link: str


@router.post("/request", status_code=status.HTTP_202_ACCEPTED)
async def request_otp(payload: OtpRequest, db: DBSession) -> dict[str, bool]:
    if not settings.brevo_enabled:
        raise HTTPException(503, "Email service not configured")

    email = payload.email.lower()

    # Drop any pending codes for this email so a fresh code is the only valid one.
    await db.execute(delete(OtpCode).where(OtpCode.email == email))

    code = f"{secrets.randbelow(1_000_000):06d}"
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=OTP_TTL_MINUTES)

    db.add(
        OtpCode(
            email=email,
            code_hash=_hash_code(code),
            expires_at=expires_at,
        )
    )
    await db.commit()

    try:
        await send_otp_code(to_email=email, code=code, ttl_minutes=OTP_TTL_MINUTES)
    except EmailError as exc:
        logger.error("OTP email send failed: {}", exc)
        # Roll the row back so a retry isn't blocked by an old hash.
        await db.execute(delete(OtpCode).where(OtpCode.email == email))
        await db.commit()
        raise HTTPException(502, "Could not send email. Please try again.") from exc

    # Always return the same shape regardless of whether the email exists in
    # Supabase yet — prevents user-enumeration via response timing/payload.
    return {"sent": True}


@router.post("/verify", response_model=OtpVerifyResponse)
async def verify_otp(payload: OtpVerify, db: DBSession) -> OtpVerifyResponse:
    email = payload.email.lower()
    row = await db.scalar(
        select(OtpCode).where(OtpCode.email == email).order_by(OtpCode.created_at.desc())
    )

    if row is None:
        raise HTTPException(400, "No active code. Request a new one.")

    if row.expires_at < datetime.now(timezone.utc):
        await db.execute(delete(OtpCode).where(OtpCode.email == email))
        await db.commit()
        raise HTTPException(400, "Code expired. Request a new one.")

    if row.attempts >= MAX_ATTEMPTS:
        await db.execute(delete(OtpCode).where(OtpCode.email == email))
        await db.commit()
        raise HTTPException(429, "Too many attempts. Request a new code.")

    if row.code_hash != _hash_code(payload.code):
        row.attempts += 1
        await db.commit()
        raise HTTPException(400, "Incorrect code")

    # Success — burn the code, mint a magic link.
    await db.execute(delete(OtpCode).where(OtpCode.email == email))
    await db.commit()

    name = email.split("@")[0]
    ensure_user(email=email, name=name)

    try:
        link = generate_magic_link(
            email=email,
            redirect_to=f"{settings.FRONTEND_URL}/dashboard",
        )
    except Exception as exc:
        logger.exception("generate_magic_link failed")
        raise HTTPException(500, "Could not start session") from exc

    return OtpVerifyResponse(action_link=link)
