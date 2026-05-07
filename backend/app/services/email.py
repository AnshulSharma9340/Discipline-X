"""Brevo (formerly Sendinblue) transactional email client.

Used for OTP sign-in codes and password-reset links. We use Brevo's HTTP API
directly — no SMTP, no extra dependency beyond httpx (already required).
"""

from __future__ import annotations

import httpx
from loguru import logger

from app.core.config import settings

BREVO_ENDPOINT = "https://api.brevo.com/v3/smtp/email"


class EmailError(RuntimeError):
    """Raised when sending email fails."""


async def _send(to_email: str, subject: str, html: str) -> None:
    if not settings.brevo_enabled:
        raise EmailError("Brevo not configured — set BREVO_API_KEY and BREVO_FROM_EMAIL")

    payload = {
        "sender": {
            "email": settings.BREVO_FROM_EMAIL,
            "name": settings.BREVO_FROM_NAME,
        },
        "to": [{"email": to_email}],
        "subject": subject,
        "htmlContent": html,
    }
    headers = {
        "api-key": settings.BREVO_API_KEY,
        "content-type": "application/json",
        "accept": "application/json",
    }

    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.post(BREVO_ENDPOINT, json=payload, headers=headers)
    if resp.status_code >= 300:
        logger.error("Brevo send failed: {} {}", resp.status_code, resp.text)
        raise EmailError(f"Brevo API returned {resp.status_code}")
    logger.info("Sent {} email to {}", subject, to_email)


def _branded_html(title: str, body_html: str) -> str:
    return f"""
<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Inter,sans-serif;color:#e5e5e5;">
    <div style="max-width:560px;margin:0 auto;padding:48px 24px;">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:32px;">
        <div style="width:28px;height:28px;border-radius:6px;background:#ffffff;color:#000;display:inline-flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;">D</div>
        <span style="font-weight:600;letter-spacing:-0.01em;">DisciplineX</span>
      </div>
      <h1 style="font-size:28px;font-weight:600;letter-spacing:-0.02em;margin:0 0 16px;color:#fff;">{title}</h1>
      {body_html}
      <hr style="border:none;border-top:1px solid #1a1a1a;margin:48px 0 16px;">
      <p style="font-size:11px;color:#666;line-height:1.6;">
        You're receiving this because someone (hopefully you) requested it for the email
        <strong style="color:#aaa;">{title.split('@')[-1] if '@' in title else ''}</strong>.
        If it wasn't you, ignore this message — no action will be taken.
      </p>
      <p style="font-size:11px;color:#666;">© DisciplineX</p>
    </div>
  </body>
</html>
"""


async def send_otp_code(to_email: str, code: str, ttl_minutes: int) -> None:
    body = f"""
      <p style="font-size:15px;color:#aaa;line-height:1.6;margin:0 0 24px;">
        Use the code below to sign in. It expires in {ttl_minutes} minutes.
      </p>
      <div style="background:#111;border:1px solid #1f1f1f;border-radius:14px;padding:28px;text-align:center;margin:0 0 24px;">
        <div style="font-family:'SF Mono',Menlo,Consolas,monospace;font-size:36px;letter-spacing:0.4em;font-weight:600;color:#fff;">
          {code}
        </div>
      </div>
      <p style="font-size:13px;color:#888;line-height:1.6;">
        Never share this code with anyone. DisciplineX will never ask for it.
      </p>
    """
    await _send(
        to_email=to_email,
        subject=f"Your DisciplineX sign-in code: {code}",
        html=_branded_html("Your sign-in code", body),
    )


async def send_password_reset_link(to_email: str, link: str) -> None:
    body = f"""
      <p style="font-size:15px;color:#aaa;line-height:1.6;margin:0 0 24px;">
        Click the button below to set a new password. The link expires in 1 hour.
      </p>
      <p style="margin:0 0 24px;">
        <a href="{link}" style="display:inline-block;background:#fff;color:#000;text-decoration:none;font-weight:500;padding:14px 28px;border-radius:9999px;">Reset password</a>
      </p>
      <p style="font-size:12px;color:#666;line-height:1.6;word-break:break-all;">
        Or paste this URL into your browser:<br>
        <a href="{link}" style="color:#888;">{link}</a>
      </p>
    """
    await _send(
        to_email=to_email,
        subject="Reset your DisciplineX password",
        html=_branded_html("Reset your password", body),
    )
