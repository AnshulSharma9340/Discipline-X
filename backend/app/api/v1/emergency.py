"""Emergency override system.

User: submit a request explaining why they couldn't complete tasks.
Admin: review, approve (temporarily unlocks user) or reject.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUser, DBSession, OrgModerator
from app.models.emergency import EmergencyRequest, EmergencyStatus
from app.models.user import AccessStatus
from app.schemas.emergency import EmergencyCreate, EmergencyPublic, EmergencyReview
from app.services.realtime import emit_admins, emit_to_user

router = APIRouter(prefix="/emergency", tags=["emergency"])


@router.post("/", response_model=EmergencyPublic, status_code=status.HTTP_201_CREATED)
async def submit_emergency(
    payload: EmergencyCreate, user: CurrentUser, db: DBSession
) -> EmergencyPublic:
    """Locked OR active users can submit; admins review."""
    req = EmergencyRequest(user_id=user.id, reason=payload.reason)
    db.add(req)
    await db.commit()
    await db.refresh(req)
    await emit_admins("emergency:new", {"request_id": str(req.id), "user_id": str(user.id)})
    return EmergencyPublic.model_validate(req)


@router.get("/mine", response_model=list[EmergencyPublic])
async def my_emergency_requests(user: CurrentUser, db: DBSession) -> list[EmergencyPublic]:
    rows = (
        await db.scalars(
            select(EmergencyRequest)
            .where(EmergencyRequest.user_id == user.id)
            .order_by(EmergencyRequest.created_at.desc())
        )
    ).all()
    return [EmergencyPublic.model_validate(r) for r in rows]


@router.get("/", response_model=list[dict])
async def list_emergency(
    mod: OrgModerator,
    db: DBSession,
    status_filter: EmergencyStatus | None = Query(None, alias="status"),
) -> list[dict]:
    from app.models.user import User as _U
    stmt = (
        select(EmergencyRequest)
        .join(_U, _U.id == EmergencyRequest.user_id)
        .where(_U.org_id == mod.org_id)
        .options(selectinload(EmergencyRequest.user))
        .order_by(EmergencyRequest.created_at.desc())
    )
    if status_filter:
        stmt = stmt.where(EmergencyRequest.status == status_filter)
    rows = (await db.scalars(stmt)).all()
    return [
        {
            "request": EmergencyPublic.model_validate(r).model_dump(mode="json"),
            "user_name": r.user.name if r.user else None,
            "user_email": r.user.email if r.user else None,
            "user_locked": r.user.access_status == AccessStatus.LOCKED if r.user else False,
        }
        for r in rows
    ]


@router.post("/{req_id}/review", response_model=EmergencyPublic)
async def review_emergency(
    req_id: uuid.UUID,
    payload: EmergencyReview,
    mod: OrgModerator,
    db: DBSession,
) -> EmergencyPublic:
    req = await db.scalar(
        select(EmergencyRequest)
        .where(EmergencyRequest.id == req_id)
        .options(selectinload(EmergencyRequest.user))
    )
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")

    req.admin_response = payload.response
    req.reviewed_at = datetime.now(timezone.utc)
    req.reviewed_by = mod.id

    if payload.approve:
        req.status = EmergencyStatus.APPROVED
        req.unlock_until = datetime.now(timezone.utc) + timedelta(hours=payload.unlock_hours)
        if req.user and req.user.access_status == AccessStatus.LOCKED:
            req.user.access_status = AccessStatus.EMERGENCY_UNLOCKED
            req.user.locked_at = None
    else:
        req.status = EmergencyStatus.REJECTED

    await db.commit()
    await db.refresh(req)
    await emit_to_user(
        str(req.user_id),
        "emergency:reviewed",
        {
            "request_id": str(req.id),
            "status": req.status.value,
            "response": req.admin_response,
            "unlock_until": req.unlock_until.isoformat() if req.unlock_until else None,
        },
    )
    return EmergencyPublic.model_validate(req)


# Admin diagnostic: trigger discipline check manually
@router.post("/trigger-discipline-check", tags=["admin"])
async def trigger_discipline_check(mod: OrgModerator) -> dict:
    from app.services.discipline import run_daily_discipline_check

    return await run_daily_discipline_check(org_id=mod.org_id)
