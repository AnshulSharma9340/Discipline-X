"""Supabase admin operations using the service-role key.

These run server-side only and let us:
  - find or create a Supabase auth user from an email or Google profile
  - generate a one-time magic-link the frontend can use to log the user in
    (after we've verified them via OTP or Google OAuth ourselves)
"""

from __future__ import annotations

from typing import Any

from loguru import logger
from supabase import Client, create_client

from app.core.config import settings


def _client() -> Client:
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)


def find_user_by_email(email: str) -> dict[str, Any] | None:
    """Return the Supabase auth user dict for this email, or None if missing."""
    client = _client()
    # supabase-py 2.x: list_users supports filtering via per_page + iteration.
    # Email lookup isn't a direct API; we iterate (small projects only).
    page = 1
    while True:
        users = client.auth.admin.list_users(page=page, per_page=200)
        # supabase-py returns a list directly here.
        if not users:
            return None
        for u in users:
            if (u.email or "").lower() == email.lower():
                return u.model_dump() if hasattr(u, "model_dump") else dict(u)
        if len(users) < 200:
            return None
        page += 1


def create_user(email: str, name: str = "", email_confirmed: bool = True) -> dict[str, Any]:
    client = _client()
    res = client.auth.admin.create_user(
        {
            "email": email,
            "email_confirm": email_confirmed,
            "user_metadata": {"name": name} if name else {},
        }
    )
    user = res.user if hasattr(res, "user") else res
    return user.model_dump() if hasattr(user, "model_dump") else dict(user)


def ensure_user(email: str, name: str = "") -> dict[str, Any]:
    existing = find_user_by_email(email)
    if existing:
        return existing
    logger.info("Creating new Supabase user for {}", email)
    return create_user(email=email, name=name, email_confirmed=True)


def _extract_action_link(res: Any) -> str:
    """Pull `properties.action_link` out of a GenerateLinkResponse."""
    props = getattr(res, "properties", None) or (res.get("properties") if isinstance(res, dict) else None)
    if props is None:
        raise RuntimeError("Supabase generate_link returned no properties")
    link = getattr(props, "action_link", None)
    if link is None and isinstance(props, dict):
        link = props.get("action_link")
    if not link:
        raise RuntimeError("Supabase generate_link returned no action_link")
    return link


def generate_magic_link(email: str, redirect_to: str | None = None) -> str:
    """Generate a magic-link the browser can navigate to for instant sign-in.

    The user is hit on `<supabase>/auth/v1/verify?...` which sets the session
    cookie and 302s to `redirect_to` with the access token in the URL hash.
    The frontend's `detectSessionInUrl: true` picks it up automatically.
    """
    client = _client()
    # `options` is required by GenerateInviteOrMagiclinkParams TypedDict,
    # even when no redirect_to is provided.
    params: dict[str, Any] = {
        "type": "magiclink",
        "email": email,
        "options": {"redirect_to": redirect_to} if redirect_to else {},
    }
    return _extract_action_link(client.auth.admin.generate_link(params))


def generate_recovery_link(email: str, redirect_to: str | None = None) -> str:
    """Like magic-link but for password reset — redirects the user to the
    frontend's /reset-password page with a recovery token. The frontend then
    calls supabase.auth.updateUser({ password }) to set the new password.
    """
    client = _client()
    params: dict[str, Any] = {
        "type": "recovery",
        "email": email,
        "options": {"redirect_to": redirect_to} if redirect_to else {},
    }
    return _extract_action_link(client.auth.admin.generate_link(params))
