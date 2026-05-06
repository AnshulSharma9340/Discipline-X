"""Accountability buddy pairing."""

from __future__ import annotations

import uuid
from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlalchemy import and_, func, or_, select
from sqlalchemy.orm import selectinload

from app.api.deps import OrgActiveUser, DBSession
from app.models.buddy import BuddyPair, BuddyStatus
from app.models.submission import SubmissionStatus, TaskSubmission
from app.models.user import User

router = APIRouter(prefix="/buddy", tags=["buddy"])


class BuddyRequest(BaseModel):
    target_user_id: uuid.UUID


def _canonical(a: uuid.UUID, b: uuid.UUID) -> tuple[uuid.UUID, uuid.UUID]:
    return (a, b) if str(a) < str(b) else (b, a)


@router.get("/me")
async def my_buddy(user: OrgActiveUser, db: DBSession):
    """Return current accepted buddy + their daily snapshot."""
    pair = await db.scalar(
        select(BuddyPair)
        .where(
            and_(
                BuddyPair.status == BuddyStatus.ACCEPTED,
                or_(BuddyPair.user_a == user.id, BuddyPair.user_b == user.id),
            )
        )
        .options(selectinload(BuddyPair.user_a_rel), selectinload(BuddyPair.user_b_rel))
    )
    if not pair:
        return None

    other = pair.user_b_rel if pair.user_a == user.id else pair.user_a_rel

    today = date.today()
    day_start = datetime(today.year, today.month, today.day, tzinfo=timezone.utc)
    day_end = day_start + timedelta(days=1)
    approved_today = (
        await db.scalar(
            select(func.count())
            .select_from(TaskSubmission)
            .where(
                TaskSubmission.user_id == other.id,
                TaskSubmission.status == SubmissionStatus.APPROVED,
                TaskSubmission.reviewed_at >= day_start,
                TaskSubmission.reviewed_at < day_end,
            )
        )
    ) or 0

    return {
        "pair_id": str(pair.id),
        "buddy": {
            "user_id": str(other.id),
            "name": other.name or other.email.split("@")[0],
            "avatar_url": other.avatar_url,
            "level": other.level,
            "xp": other.xp,
            "streak": other.streak,
            "approved_today": int(approved_today),
        },
        "since": pair.created_at.isoformat(),
    }


@router.get("/incoming")
async def incoming_requests(user: OrgActiveUser, db: DBSession):
    """Pending requests where someone else asked to buddy with me."""
    rows = (
        await db.scalars(
            select(BuddyPair)
            .where(
                and_(
                    BuddyPair.status == BuddyStatus.PENDING,
                    or_(BuddyPair.user_a == user.id, BuddyPair.user_b == user.id),
                    BuddyPair.requested_by != user.id,
                )
            )
            .options(selectinload(BuddyPair.user_a_rel), selectinload(BuddyPair.user_b_rel))
        )
    ).all()
    out = []
    for p in rows:
        from_user = p.user_a_rel if p.requested_by == p.user_a else p.user_b_rel
        out.append(
            {
                "pair_id": str(p.id),
                "from": {
                    "user_id": str(from_user.id),
                    "name": from_user.name or from_user.email.split("@")[0],
                    "level": from_user.level,
                    "xp": from_user.xp,
                },
                "created_at": p.created_at.isoformat(),
            }
        )
    return out


@router.get("/candidates")
async def candidates(user: OrgActiveUser, db: DBSession):
    """Other active users you could buddy with."""
    others = (
        await db.scalars(
            select(User)
            .where(User.id != user.id, User.is_active.is_(True))
            .order_by(User.xp.desc())
            .limit(50)
        )
    ).all()
    return [
        {
            "user_id": str(u.id),
            "name": u.name or u.email.split("@")[0],
            "level": u.level,
            "xp": u.xp,
            "streak": u.streak,
        }
        for u in others
    ]


@router.post("/request")
async def request_buddy(payload: BuddyRequest, user: OrgActiveUser, db: DBSession):
    if payload.target_user_id == user.id:
        raise HTTPException(400, "Cannot buddy with yourself")
    target = await db.get(User, payload.target_user_id)
    if not target:
        raise HTTPException(404, "User not found")

    a, b = _canonical(user.id, payload.target_user_id)
    existing = await db.scalar(
        select(BuddyPair).where(BuddyPair.user_a == a, BuddyPair.user_b == b)
    )
    if existing and existing.status in (BuddyStatus.ACCEPTED, BuddyStatus.PENDING):
        raise HTTPException(409, f"Already {existing.status.value}")
    if existing:
        existing.status = BuddyStatus.PENDING
        existing.requested_by = user.id
        await db.commit()
        return {"ok": True, "pair_id": str(existing.id)}

    pair = BuddyPair(user_a=a, user_b=b, requested_by=user.id, status=BuddyStatus.PENDING)
    db.add(pair)
    await db.commit()
    await db.refresh(pair)
    return {"ok": True, "pair_id": str(pair.id)}


@router.post("/{pair_id}/accept")
async def accept(pair_id: uuid.UUID, user: OrgActiveUser, db: DBSession):
    p = await db.get(BuddyPair, pair_id)
    if not p:
        raise HTTPException(404, "Request not found")
    if user.id not in (p.user_a, p.user_b):
        raise HTTPException(403, "Not yours to accept")
    if p.requested_by == user.id:
        raise HTTPException(400, "You sent the request — wait for the other side")

    # End any other ACCEPTED pairs the user is in
    others = (
        await db.scalars(
            select(BuddyPair).where(
                and_(
                    BuddyPair.status == BuddyStatus.ACCEPTED,
                    or_(BuddyPair.user_a == user.id, BuddyPair.user_b == user.id),
                )
            )
        )
    ).all()
    for o in others:
        o.status = BuddyStatus.ENDED

    p.status = BuddyStatus.ACCEPTED
    await db.commit()
    return {"ok": True}


@router.post("/{pair_id}/reject")
async def reject(pair_id: uuid.UUID, user: OrgActiveUser, db: DBSession):
    p = await db.get(BuddyPair, pair_id)
    if not p:
        raise HTTPException(404, "Request not found")
    if user.id not in (p.user_a, p.user_b):
        raise HTTPException(403, "Not yours")
    p.status = BuddyStatus.REJECTED
    await db.commit()
    return {"ok": True}


@router.post("/end")
async def end(user: OrgActiveUser, db: DBSession):
    rows = (
        await db.scalars(
            select(BuddyPair).where(
                and_(
                    BuddyPair.status == BuddyStatus.ACCEPTED,
                    or_(BuddyPair.user_a == user.id, BuddyPair.user_b == user.id),
                )
            )
        )
    ).all()
    for p in rows:
        p.status = BuddyStatus.ENDED
    await db.commit()
    return {"ok": True, "ended": len(rows)}
