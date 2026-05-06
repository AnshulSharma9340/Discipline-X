"""Supabase JWT verification.

Supports BOTH signing modes:
  - Modern asymmetric (ES256/RS256) — verified via JWKS endpoint
  - Legacy symmetric (HS256) — verified with SUPABASE_JWT_SECRET

We pick the path automatically by inspecting the token header. The 'sub'
claim is the Supabase auth user UUID — our canonical user identifier.
"""

from __future__ import annotations

from typing import Any

import jwt
from fastapi import HTTPException, status
from jwt import InvalidTokenError, PyJWKClient

from app.core.config import settings

_JWKS_URL = f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1/.well-known/jwks.json"
_jwks_client: PyJWKClient | None = None


def _get_jwks_client() -> PyJWKClient:
    """Lazily build the JWKS client (caches keys for the process lifetime)."""
    global _jwks_client
    if _jwks_client is None:
        _jwks_client = PyJWKClient(_JWKS_URL, cache_keys=True, lifespan=3600)
    return _jwks_client


def decode_supabase_token(token: str) -> dict[str, Any]:
    """Verify a Supabase-issued JWT and return the claims.

    Raises HTTPException(401) if the token is invalid or expired.
    """
    try:
        unverified_header = jwt.get_unverified_header(token)
        alg = unverified_header.get("alg", "HS256")

        if alg in ("ES256", "RS256", "EdDSA"):
            # Asymmetric: verify with the public key from JWKS
            signing_key = _get_jwks_client().get_signing_key_from_jwt(token)
            payload = jwt.decode(
                token,
                signing_key.key,
                algorithms=[alg],
                audience="authenticated",
                options={"require": ["exp", "sub"]},
            )
        else:
            # Symmetric (legacy HS256)
            payload = jwt.decode(
                token,
                settings.SUPABASE_JWT_SECRET,
                algorithms=["HS256"],
                audience="authenticated",
                options={"require": ["exp", "sub"]},
            )
    except InvalidTokenError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid auth token: {e}",
            headers={"WWW-Authenticate": "Bearer"},
        ) from e
    return payload
