"""FastAPI dependencies: DB session, current user, RBAC + org-scoped guards."""

import uuid
from typing import Annotated

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.security import decode_supabase_token
from app.models.organization import OrgRole
from app.models.user import AccessStatus, User, UserRole

DBSession = Annotated[AsyncSession, Depends(get_db)]


async def _get_or_sync_user(db: AsyncSession, claims: dict) -> User:
    user_id = uuid.UUID(claims["sub"])
    user = await db.get(User, user_id)
    if user is not None:
        return user

    email = claims.get("email") or f"{user_id}@unknown.local"
    name = (claims.get("user_metadata") or {}).get("name", "") or email.split("@")[0]

    role = UserRole.USER
    if settings.AUTO_PROMOTE_FIRST_USER:
        existing_count = await db.scalar(select(func.count()).select_from(User))
        if existing_count == 0:
            role = UserRole.ADMIN

    user = User(id=user_id, email=email, name=name, role=role)
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def get_current_user(
    db: DBSession,
    authorization: Annotated[str | None, Header()] = None,
) -> User:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or malformed Authorization header",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = authorization.split(" ", 1)[1].strip()
    claims = decode_supabase_token(token)
    return await _get_or_sync_user(db, claims)


CurrentUser = Annotated[User, Depends(get_current_user)]


async def require_admin(user: CurrentUser) -> User:
    """Legacy global-admin check. Used for cross-org operations only.

    For per-org operations, prefer require_org_owner / require_org_moderator.
    """
    if user.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return user


async def require_active(user: CurrentUser) -> User:
    if user.access_status == AccessStatus.LOCKED:
        raise HTTPException(
            status_code=status.HTTP_423_LOCKED,
            detail="Account locked by discipline engine. Submit emergency request to regain access.",
        )
    return user


# ---- Organization-scoped guards ----


async def require_org_member(user: CurrentUser) -> User:
    """User must belong to some organization (else trigger onboarding flow)."""
    if not user.org_id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="No organization. Create one or join via invite code.",
        )
    return user


async def require_org_moderator(user: CurrentUser) -> User:
    """User must be MODERATOR or OWNER of their org."""
    if not user.org_id or user.org_role not in (OrgRole.MODERATOR, OrgRole.OWNER):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Org moderator access required",
        )
    return user


async def require_org_owner(user: CurrentUser) -> User:
    """User must be the OWNER of their org."""
    if not user.org_id or user.org_role != OrgRole.OWNER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the org owner can do this",
        )
    return user


async def require_org_active(user: CurrentUser) -> User:
    """Combined: must be in an org AND not locked out."""
    if user.access_status == AccessStatus.LOCKED:
        raise HTTPException(
            status_code=status.HTTP_423_LOCKED,
            detail="Account locked. Submit emergency request to regain access.",
        )
    if not user.org_id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="No organization. Create one or join via invite code.",
        )
    return user


AdminUser = Annotated[User, Depends(require_admin)]
ActiveUser = Annotated[User, Depends(require_active)]
OrgMember = Annotated[User, Depends(require_org_member)]
OrgModerator = Annotated[User, Depends(require_org_moderator)]
OrgOwner = Annotated[User, Depends(require_org_owner)]
OrgActiveUser = Annotated[User, Depends(require_org_active)]
