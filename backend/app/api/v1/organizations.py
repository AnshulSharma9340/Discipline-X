"""Organization endpoints — create, join, manage, members."""

from __future__ import annotations

import re
import uuid

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError

from app.api.deps import CurrentUser, DBSession, OrgMember, OrgOwner
from app.models.organization import Organization, OrgRole, generate_invite_code
from app.models.user import User, UserRole

router = APIRouter(prefix="/orgs", tags=["organizations"])


def _slugify(name: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    return s[:60] or "org"


def _serialize(o: Organization, member_count: int = 0) -> dict:
    return {
        "id": str(o.id),
        "name": o.name,
        "slug": o.slug,
        "description": o.description,
        "invite_code": o.invite_code,
        "owner_id": str(o.owner_id),
        "is_open": o.is_open,
        "member_count": member_count,
        "created_at": o.created_at.isoformat(),
    }


class OrgCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=80)
    description: str = ""


class OrgJoin(BaseModel):
    invite_code: str = Field(..., min_length=3, max_length=20)


class OrgUpdate(BaseModel):
    name: str | None = Field(None, min_length=2, max_length=80)
    description: str | None = None


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_org(payload: OrgCreate, user: CurrentUser, db: DBSession):
    if user.org_id:
        raise HTTPException(409, "You're already in an organization. Leave first.")

    base_slug = _slugify(payload.name)
    slug = base_slug
    suffix = 1
    while await db.scalar(select(Organization).where(Organization.slug == slug)):
        suffix += 1
        slug = f"{base_slug}-{suffix}"

    org = Organization(
        name=payload.name.strip(),
        slug=slug,
        description=payload.description,
        invite_code=generate_invite_code(),
        owner_id=user.id,
    )
    db.add(org)
    try:
        await db.flush()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(409, "Could not create org (name collision)")

    user.org_id = org.id
    user.org_role = OrgRole.OWNER
    user.role = UserRole.ADMIN  # legacy field — keep in sync for owner
    await db.commit()
    await db.refresh(org)

    return _serialize(org, member_count=1)


@router.post("/join")
async def join_org(payload: OrgJoin, user: CurrentUser, db: DBSession):
    if user.org_id:
        raise HTTPException(409, "You're already in an organization. Leave first.")

    org = await db.scalar(
        select(Organization).where(Organization.invite_code == payload.invite_code.strip().upper())
    )
    if not org:
        raise HTTPException(404, "Invalid invite code")

    user.org_id = org.id
    user.org_role = OrgRole.MEMBER
    user.role = UserRole.USER
    await db.commit()

    count = await db.scalar(select(func.count()).select_from(User).where(User.org_id == org.id)) or 0
    return _serialize(org, member_count=int(count))


@router.post("/leave")
async def leave_org(user: CurrentUser, db: DBSession):
    if not user.org_id:
        raise HTTPException(409, "Not in an organization")

    # Owner cannot leave (would orphan the org). Must transfer ownership first.
    if user.org_role == OrgRole.OWNER:
        raise HTTPException(
            409,
            "Owners cannot leave. Transfer ownership to another member first, or delete the org.",
        )

    user.org_id = None
    user.org_role = None
    await db.commit()
    return {"ok": True}


@router.get("/me")
async def my_org(user: OrgMember, db: DBSession):
    org = await db.get(Organization, user.org_id)
    if not org:
        raise HTTPException(404, "Org not found")
    count = await db.scalar(select(func.count()).select_from(User).where(User.org_id == org.id)) or 0
    out = _serialize(org, member_count=int(count))
    # Hide invite code from non-owners/mods
    if user.org_role not in (OrgRole.OWNER, OrgRole.MODERATOR):
        out["invite_code"] = None
    out["my_role"] = user.org_role.value if user.org_role else None
    return out


@router.patch("/me")
async def update_org(payload: OrgUpdate, owner: OrgOwner, db: DBSession):
    org = await db.get(Organization, owner.org_id)
    if not org:
        raise HTTPException(404, "Org not found")
    if payload.name is not None:
        org.name = payload.name.strip()
    if payload.description is not None:
        org.description = payload.description
    await db.commit()
    return {"ok": True}


@router.post("/me/regenerate-invite")
async def regenerate_invite(owner: OrgOwner, db: DBSession):
    org = await db.get(Organization, owner.org_id)
    if not org:
        raise HTTPException(404, "Org not found")
    # Try a few times in case of collision
    for _ in range(5):
        new_code = generate_invite_code()
        if not await db.scalar(select(Organization).where(Organization.invite_code == new_code)):
            org.invite_code = new_code
            await db.commit()
            return {"invite_code": new_code}
    raise HTTPException(500, "Could not generate unique invite code")


@router.get("/me/members")
async def list_members(user: OrgMember, db: DBSession):
    rows = (
        await db.scalars(
            select(User).where(User.org_id == user.org_id).order_by(User.xp.desc())
        )
    ).all()
    return [
        {
            "user_id": str(u.id),
            "email": u.email,
            "name": u.name or u.email.split("@")[0],
            "avatar_url": u.avatar_url,
            "org_role": u.org_role.value if u.org_role else None,
            "xp": u.xp,
            "level": u.level,
            "streak": u.streak,
            "access_status": u.access_status.value,
            "joined": u.created_at.isoformat(),
        }
        for u in rows
    ]


class MemberRoleUpdate(BaseModel):
    role: OrgRole


@router.patch("/me/members/{user_id}/role")
async def update_member_role(
    user_id: uuid.UUID, payload: MemberRoleUpdate, owner: OrgOwner, db: DBSession
):
    target = await db.get(User, user_id)
    if not target or target.org_id != owner.org_id:
        raise HTTPException(404, "Member not found")
    if target.id == owner.id:
        raise HTTPException(409, "Use transfer-ownership endpoint to demote yourself")
    target.org_role = payload.role
    target.role = UserRole.MODERATOR if payload.role == OrgRole.MODERATOR else UserRole.USER
    await db.commit()
    return {"ok": True, "user_id": str(target.id), "role": target.org_role.value}


@router.delete("/me/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
async def remove_member(user_id: uuid.UUID, owner: OrgOwner, db: DBSession):
    target = await db.get(User, user_id)
    if not target or target.org_id != owner.org_id:
        raise HTTPException(404, "Member not found")
    if target.id == owner.id:
        raise HTTPException(409, "Owner cannot remove themselves")
    target.org_id = None
    target.org_role = None
    await db.commit()


class TransferOwnership(BaseModel):
    new_owner_id: uuid.UUID


@router.post("/me/transfer-ownership")
async def transfer(payload: TransferOwnership, owner: OrgOwner, db: DBSession):
    target = await db.get(User, payload.new_owner_id)
    if not target or target.org_id != owner.org_id:
        raise HTTPException(404, "Member not found")
    if target.id == owner.id:
        raise HTTPException(409, "Already the owner")

    org = await db.get(Organization, owner.org_id)
    if org:
        org.owner_id = target.id

    target.org_role = OrgRole.OWNER
    target.role = UserRole.ADMIN
    owner.org_role = OrgRole.MODERATOR
    owner.role = UserRole.MODERATOR
    await db.commit()
    return {"ok": True}


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
async def delete_org(owner: OrgOwner, db: DBSession):
    org = await db.get(Organization, owner.org_id)
    if not org:
        raise HTTPException(404, "Org not found")

    # Detach members (their data stays; they'll need to join/create another org)
    members = (await db.scalars(select(User).where(User.org_id == org.id))).all()
    for m in members:
        m.org_id = None
        m.org_role = None

    await db.delete(org)
    await db.commit()
