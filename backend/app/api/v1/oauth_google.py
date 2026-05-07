"""Backend-driven Google OAuth sign-in.

Flow:
  GET  /auth/google/login              → 302 to Google's authorize URL
  GET  /auth/google/callback?code=...  → exchange code for token, fetch profile,
                                          ensure Supabase user, mint magic link,
                                          302 the browser to that link so
                                          Supabase logs them in and bounces
                                          them to the frontend dashboard.
"""

from __future__ import annotations

import secrets
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import RedirectResponse
from loguru import logger

from app.core.config import settings
from app.services.supabase_admin import ensure_user, generate_magic_link

router = APIRouter(prefix="/auth/google", tags=["auth"])

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"

STATE_COOKIE = "dx_oauth_state"
STATE_TTL_SECONDS = 600


@router.get("/login")
async def google_login() -> RedirectResponse:
    if not settings.google_oauth_enabled:
        raise HTTPException(503, "Google OAuth not configured")

    state = secrets.token_urlsafe(24)
    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "online",
        "prompt": "select_account",
        "state": state,
    }
    url = f"{GOOGLE_AUTH_URL}?{urlencode(params)}"
    resp = RedirectResponse(url=url, status_code=302)
    resp.set_cookie(
        STATE_COOKIE,
        state,
        max_age=STATE_TTL_SECONDS,
        httponly=True,
        secure=settings.is_production,
        samesite="lax",
        path="/api/v1/auth/google",
    )
    return resp


@router.get("/callback")
async def google_callback(request: Request) -> RedirectResponse:
    if not settings.google_oauth_enabled:
        raise HTTPException(503, "Google OAuth not configured")

    code = request.query_params.get("code")
    state = request.query_params.get("state")
    cookie_state = request.cookies.get(STATE_COOKIE)

    if not code or not state or not cookie_state or state != cookie_state:
        raise HTTPException(400, "Invalid OAuth state")

    # Exchange authorization code for an access token.
    async with httpx.AsyncClient(timeout=15.0) as client:
        token_resp = await client.post(
            GOOGLE_TOKEN_URL,
            data={
                "code": code,
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "redirect_uri": settings.GOOGLE_REDIRECT_URI,
                "grant_type": "authorization_code",
            },
        )
        if token_resp.status_code != 200:
            logger.error("Google token exchange failed: {} {}", token_resp.status_code, token_resp.text)
            raise HTTPException(400, "Google token exchange failed")
        access_token = token_resp.json().get("access_token")
        if not access_token:
            raise HTTPException(400, "No access token from Google")

        info_resp = await client.get(
            GOOGLE_USERINFO_URL,
            headers={"Authorization": f"Bearer {access_token}"},
        )
        if info_resp.status_code != 200:
            logger.error("Google userinfo failed: {} {}", info_resp.status_code, info_resp.text)
            raise HTTPException(400, "Could not fetch Google profile")
        profile = info_resp.json()

    email = (profile.get("email") or "").lower()
    if not email or not profile.get("email_verified", False):
        raise HTTPException(400, "Google account email not verified")
    name = profile.get("name") or email.split("@")[0]

    ensure_user(email=email, name=name)

    try:
        link = generate_magic_link(
            email=email,
            redirect_to=f"{settings.FRONTEND_URL}/dashboard",
        )
    except Exception as exc:
        logger.exception("generate_magic_link failed for Google sign-in")
        raise HTTPException(500, "Could not start session") from exc

    resp = RedirectResponse(url=link, status_code=302)
    resp.delete_cookie(STATE_COOKIE, path="/api/v1/auth/google")
    return resp
