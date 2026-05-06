"""Squads — sub-teams within the workspace, with their own leaderboards."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from app.api.deps import DBSession, OrgActiveUser, OrgOwner
from app.models.squad import Squad, SquadMember
from app.models.user import User

router = APIRouter(prefix="/squads", tags=["squads"])


class SquadCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=80)
    description: str = ""
    color: str = "violet"
    emoji: str = "⚔️"
    group_streak_mode: bool = False


class SquadUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=80)
    description: str | None = None
    color: str | None = None
    emoji: str | None = None
    group_streak_mode: bool | None = None


def _serialize(s: Squad, members: list[SquadMember] | None = None) -> dict:
    return {
        "id": str(s.id),
        "name": s.name,
        "description": s.description,
        "color": s.color,
        "emoji": s.emoji,
        "group_streak_mode": s.group_streak_mode,
        "streak": s.streak,
        "longest_streak": s.longest_streak,
        "member_count": len(members) if members is not None else len(s.members),
    }


@router.get("/")
async def list_squads(user: OrgActiveUser, db: DBSession):
    _ = user
    rows = (
        await db.scalars(
            select(Squad)
            .where(Squad.org_id == user.org_id)
            .options(selectinload(Squad.members))
            .order_by(Squad.name.asc())
        )
    ).all()
    return [_serialize(s) for s in rows]


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_squad(payload: SquadCreate, owner: OrgOwner, db: DBSession):
    s = Squad(**payload.model_dump(), org_id=owner.org_id)
    db.add(s)
    try:
        await db.commit()
    except Exception:
        await db.rollback()
        raise HTTPException(409, "Squad name already taken")
    await db.refresh(s)
    return _serialize(s, members=[])


@router.patch("/{squad_id}")
async def update_squad(squad_id: uuid.UUID, payload: SquadUpdate, owner: OrgOwner, db: DBSession):
    s = await db.get(Squad, squad_id)
    if not s or s.org_id != owner.org_id:
        raise HTTPException(404, "Squad not found in your organization")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(s, k, v)
    await db.commit()
    return {"ok": True}


@router.delete("/{squad_id}", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
async def delete_squad(squad_id: uuid.UUID, owner: OrgOwner, db: DBSession):
    s = await db.get(Squad, squad_id)
    if not s or s.org_id != owner.org_id:
        raise HTTPException(404, "Squad not found in your organization")
    await db.delete(s)
    await db.commit()


@router.post("/{squad_id}/join")
async def join_squad(squad_id: uuid.UUID, user: OrgActiveUser, db: DBSession):
    s = await db.get(Squad, squad_id)
    if not s or s.org_id != user.org_id:
        raise HTTPException(404, "Squad not found in your organization")

    # Leave any existing squads first (one squad per user)
    existing = (
        await db.scalars(select(SquadMember).where(SquadMember.user_id == user.id))
    ).all()
    for m in existing:
        await db.delete(m)

    db.add(SquadMember(squad_id=squad_id, user_id=user.id))
    await db.commit()
    return {"ok": True, "squad_id": str(squad_id)}


@router.post("/leave")
async def leave_squad(user: OrgActiveUser, db: DBSession):
    rows = (
        await db.scalars(select(SquadMember).where(SquadMember.user_id == user.id))
    ).all()
    for m in rows:
        await db.delete(m)
    await db.commit()
    return {"ok": True}


@router.get("/me")
async def my_squad(user: OrgActiveUser, db: DBSession):
    """The squad the current user belongs to (or null) with full member roster."""
    membership = await db.scalar(
        select(SquadMember)
        .where(SquadMember.user_id == user.id)
        .options(selectinload(SquadMember.squad).selectinload(Squad.members).selectinload(SquadMember.user))
    )
    if not membership:
        return None

    s = membership.squad
    members_sorted = sorted(s.members, key=lambda m: -(m.user.xp if m.user else 0))
    return {
        **_serialize(s, members=s.members),
        "members": [
            {
                "user_id": str(m.user_id),
                "name": (m.user.name if m.user else "") or m.user.email.split("@")[0],
                "avatar_url": m.user.avatar_url if m.user else None,
                "role": m.role,
                "xp": m.user.xp if m.user else 0,
                "streak": m.user.streak if m.user else 0,
                "level": m.user.level if m.user else 1,
            }
            for m in members_sorted
        ],
    }


@router.get("/leaderboard")
async def squad_leaderboard(user: OrgActiveUser, db: DBSession):
    """Squads ranked by total XP of their members — within the user's org."""
    stmt = (
        select(
            Squad.id,
            Squad.name,
            Squad.emoji,
            Squad.color,
            Squad.streak,
            func.coalesce(func.sum(User.xp), 0).label("total_xp"),
            func.count(SquadMember.id).label("member_count"),
        )
        .join(SquadMember, SquadMember.squad_id == Squad.id, isouter=True)
        .join(User, User.id == SquadMember.user_id, isouter=True)
        .where(Squad.org_id == user.org_id)
        .group_by(Squad.id)
        .order_by(func.coalesce(func.sum(User.xp), 0).desc())
    )
    rows = (await db.execute(stmt)).all()
    return [
        {
            "rank": i + 1,
            "squad_id": str(r.id),
            "name": r.name,
            "emoji": r.emoji,
            "color": r.color,
            "streak": int(r.streak),
            "total_xp": int(r.total_xp),
            "member_count": int(r.member_count),
        }
        for i, r in enumerate(rows)
    ]
