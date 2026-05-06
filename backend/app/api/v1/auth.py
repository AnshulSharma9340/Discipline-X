"""Auth-related endpoints.

Sign-up and sign-in happen on the frontend via @supabase/supabase-js so passwords
never touch our backend. This module exposes /me to retrieve the synced user
profile and /logout for symmetry (frontend clears Supabase session).
"""

from fastapi import APIRouter

from app.api.deps import CurrentUser
from app.schemas.auth import MeResponse
from app.schemas.user import UserPublic

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/me", response_model=MeResponse)
async def me(user: CurrentUser) -> MeResponse:
    """Return the current authenticated user, syncing to our DB on first hit."""
    return MeResponse(user=UserPublic.model_validate(user))
