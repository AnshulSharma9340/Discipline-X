"""Organization endpoints — create, join, manage, members."""

from __future__ import annotations

import re
import uuid

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError

from app.api.deps import CurrentUser, DBSession, OrgMember, OrgOwner
from app.models.membership import OrganizationMembership
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


async def _set_active_org(user: User, org_id: uuid.UUID, role: OrgRole) -> None:
    """Switch this user's active org pointer + sync legacy role flag."""
    user.org_id = org_id
    user.org_role = role
    user.role = (
        UserRole.ADMIN
        if role == OrgRole.OWNER
        else UserRole.MODERATOR
        if role == OrgRole.MODERATOR
        else UserRole.USER
    )


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_org(payload: OrgCreate, user: CurrentUser, db: DBSession):
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

    db.add(OrganizationMembership(user_id=user.id, org_id=org.id, role=OrgRole.OWNER))
    await _set_active_org(user, org.id, OrgRole.OWNER)
    await db.commit()
    await db.refresh(org)

    return _serialize(org, member_count=1)


@router.post("/join")
async def join_org(payload: OrgJoin, user: CurrentUser, db: DBSession):
    org = await db.scalar(
        select(Organization).where(Organization.invite_code == payload.invite_code.strip().upper())
    )
    if not org:
        raise HTTPException(404, "Invalid invite code")

    existing = await db.scalar(
        select(OrganizationMembership).where(
            OrganizationMembership.user_id == user.id,
            OrganizationMembership.org_id == org.id,
        )
    )
    if existing is None:
        db.add(OrganizationMembership(user_id=user.id, org_id=org.id, role=OrgRole.MEMBER))
        new_role = OrgRole.MEMBER
    else:
        new_role = existing.role

    await _set_active_org(user, org.id, new_role)
    await db.commit()

    count = await db.scalar(
        select(func.count())
        .select_from(OrganizationMembership)
        .where(OrganizationMembership.org_id == org.id)
    ) or 0
    return _serialize(org, member_count=int(count))


@router.get("/my")
async def list_my_orgs(user: CurrentUser, db: DBSession):
    """All organizations this user belongs to, with their role per org."""
    rows = (
        await db.execute(
            select(OrganizationMembership, Organization)
            .join(Organization, Organization.id == OrganizationMembership.org_id)
            .where(OrganizationMembership.user_id == user.id)
            .order_by(OrganizationMembership.joined_at.asc())
        )
    ).all()
    return [
        {
            "id": str(o.id),
            "name": o.name,
            "slug": o.slug,
            "description": o.description,
            "my_role": m.role.value,
            "is_active": user.org_id == o.id,
            "joined_at": m.joined_at.isoformat(),
        }
        for m, o in rows
    ]


@router.post("/switch/{org_id}")
async def switch_org(org_id: uuid.UUID, user: CurrentUser, db: DBSession):
    """Change which org is the user's active context."""
    membership = await db.scalar(
        select(OrganizationMembership).where(
            OrganizationMembership.user_id == user.id,
            OrganizationMembership.org_id == org_id,
        )
    )
    if not membership:
        raise HTTPException(403, "You're not a member of that organization")

    org = await db.get(Organization, org_id)
    if not org:
        raise HTTPException(404, "Org not found")

    await _set_active_org(user, org_id, membership.role)
    await db.commit()
    return {
        "ok": True,
        "active_org_id": str(org_id),
        "name": org.name,
        "my_role": membership.role.value,
    }


@router.post("/leave")
async def leave_org(user: CurrentUser, db: DBSession):
    if not user.org_id:
        raise HTTPException(409, "Not in an organization")

    if user.org_role == OrgRole.OWNER:
        raise HTTPException(
            409,
            "Owners cannot leave. Transfer ownership to another member first, or delete the org.",
        )

    leaving_org_id = user.org_id

    # Drop the membership for the org they're leaving.
    await db.execute(
        delete_membership(user.id, leaving_org_id)
    )

    # Auto-switch active org to another membership if any exists.
    next_membership = await db.scalar(
        select(OrganizationMembership)
        .where(OrganizationMembership.user_id == user.id)
        .order_by(OrganizationMembership.joined_at.asc())
    )
    if next_membership:
        await _set_active_org(user, next_membership.org_id, next_membership.role)
    else:
        user.org_id = None
        user.org_role = None
        user.role = UserRole.USER

    await db.commit()
    return {
        "ok": True,
        "active_org_id": str(user.org_id) if user.org_id else None,
    }


def delete_membership(user_id: uuid.UUID, org_id: uuid.UUID):
    """Build a DELETE statement for one membership row."""
    from sqlalchemy import delete as sa_delete
    return sa_delete(OrganizationMembership).where(
        OrganizationMembership.user_id == user_id,
        OrganizationMembership.org_id == org_id,
    )


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
    membership = await db.scalar(
        select(OrganizationMembership).where(
            OrganizationMembership.user_id == user_id,
            OrganizationMembership.org_id == owner.org_id,
        )
    )
    if not membership:
        raise HTTPException(404, "Member not found")
    if user_id == owner.id:
        raise HTTPException(409, "Use transfer-ownership endpoint to demote yourself")

    membership.role = payload.role

    # Keep the active-org pointer in sync if this user currently has this org active.
    target = await db.get(User, user_id)
    if target and target.org_id == owner.org_id:
        target.org_role = payload.role
        target.role = (
            UserRole.MODERATOR if payload.role == OrgRole.MODERATOR else UserRole.USER
        )

    await db.commit()
    return {"ok": True, "user_id": str(user_id), "role": payload.role.value}


@router.delete("/me/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
async def remove_member(user_id: uuid.UUID, owner: OrgOwner, db: DBSession):
    membership = await db.scalar(
        select(OrganizationMembership).where(
            OrganizationMembership.user_id == user_id,
            OrganizationMembership.org_id == owner.org_id,
        )
    )
    if not membership:
        raise HTTPException(404, "Member not found")
    if user_id == owner.id:
        raise HTTPException(409, "Owner cannot remove themselves")

    await db.execute(delete_membership(user_id, owner.org_id))

    # If they had this org active, auto-switch them to another or null it out.
    target = await db.get(User, user_id)
    if target and target.org_id == owner.org_id:
        next_m = await db.scalar(
            select(OrganizationMembership)
            .where(OrganizationMembership.user_id == user_id)
            .order_by(OrganizationMembership.joined_at.asc())
        )
        if next_m:
            target.org_id = next_m.org_id
            target.org_role = next_m.role
            target.role = (
                UserRole.ADMIN
                if next_m.role == OrgRole.OWNER
                else UserRole.MODERATOR
                if next_m.role == OrgRole.MODERATOR
                else UserRole.USER
            )
        else:
            target.org_id = None
            target.org_role = None
            target.role = UserRole.USER

    await db.commit()


class TransferOwnership(BaseModel):
    new_owner_id: uuid.UUID


@router.post("/me/transfer-ownership")
async def transfer(payload: TransferOwnership, owner: OrgOwner, db: DBSession):
    target_membership = await db.scalar(
        select(OrganizationMembership).where(
            OrganizationMembership.user_id == payload.new_owner_id,
            OrganizationMembership.org_id == owner.org_id,
        )
    )
    if not target_membership:
        raise HTTPException(404, "Member not found")
    if payload.new_owner_id == owner.id:
        raise HTTPException(409, "Already the owner")

    owner_membership = await db.scalar(
        select(OrganizationMembership).where(
            OrganizationMembership.user_id == owner.id,
            OrganizationMembership.org_id == owner.org_id,
        )
    )

    org = await db.get(Organization, owner.org_id)
    if org:
        org.owner_id = payload.new_owner_id

    target_membership.role = OrgRole.OWNER
    if owner_membership:
        owner_membership.role = OrgRole.MODERATOR

    # Sync the active-org legacy fields if either user has this org active.
    target_user = await db.get(User, payload.new_owner_id)
    if target_user and target_user.org_id == owner.org_id:
        target_user.org_role = OrgRole.OWNER
        target_user.role = UserRole.ADMIN
    owner.org_role = OrgRole.MODERATOR
    owner.role = UserRole.MODERATOR

    await db.commit()
    return {"ok": True}


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
async def delete_org(owner: OrgOwner, db: DBSession):
    org = await db.get(Organization, owner.org_id)
    if not org:
        raise HTTPException(404, "Org not found")

    deleted_org_id = org.id

    # CASCADE on the FK will drop all OrganizationMembership rows for this org
    # automatically, but for users who had this org as their *active* org we
    # still need to migrate them to another membership (or null) because
    # User.org_id is SET NULL on cascade by the schema.

    affected = (
        await db.scalars(select(User).where(User.org_id == deleted_org_id))
    ).all()

    await db.delete(org)
    await db.flush()  # cascade drops memberships for this org

    for u in affected:
        next_m = await db.scalar(
            select(OrganizationMembership)
            .where(OrganizationMembership.user_id == u.id)
            .order_by(OrganizationMembership.joined_at.asc())
        )
        if next_m:
            u.org_id = next_m.org_id
            u.org_role = next_m.role
            u.role = (
                UserRole.ADMIN
                if next_m.role == OrgRole.OWNER
                else UserRole.MODERATOR
                if next_m.role == OrgRole.MODERATOR
                else UserRole.USER
            )
        else:
            u.org_id = None
            u.org_role = None
            u.role = UserRole.USER

    await db.commit()
