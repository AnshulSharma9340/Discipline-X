"""Backend-driven password reset.

Flow:
  POST /auth/password/forgot {email}  → mint a Supabase recovery link via
                                         the admin API, email it via Brevo.
                                         The user clicks the link, lands on
                                         /reset-password with a recovery
                                         token, and the existing frontend
                                         page calls supabase.auth.updateUser
                                         to set the new password.

We always return 202 regardless of whether the email exists, to prevent
user-enumeration via API responses.
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, status
from loguru import logger
from pydantic import BaseModel, EmailStr

from app.core.config import settings
from app.services.email import EmailError, send_password_reset_link
from app.services.supabase_admin import find_user_by_email, generate_recovery_link

router = APIRouter(prefix="/auth/password", tags=["auth"])


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


@router.post("/forgot", status_code=status.HTTP_202_ACCEPTED)
async def forgot_password(payload: ForgotPasswordRequest) -> dict[str, bool]:
    if not settings.brevo_enabled:
        raise HTTPException(503, "Email service not configured")

    email = payload.email.lower()
    user = find_user_by_email(email)
    if user is None:
        # Don't leak existence — pretend we sent it.
        logger.info("Password-reset requested for non-existent email {}", email)
        return {"sent": True}

    try:
        link = generate_recovery_link(
            email=email,
            redirect_to=f"{settings.FRONTEND_URL}/reset-password",
        )
    except Exception as exc:
        logger.exception("generate_recovery_link failed")
        raise HTTPException(500, "Could not start password reset") from exc

    try:
        await send_password_reset_link(to_email=email, link=link)
    except EmailError as exc:
        logger.error("Reset email send failed: {}", exc)
        raise HTTPException(502, "Could not send email. Please try again.") from exc

    return {"sent": True}
