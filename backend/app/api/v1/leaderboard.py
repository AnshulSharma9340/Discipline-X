from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, Query

from app.api.deps import DBSession, OrgActiveUser
from app.services import analytics as svc

router = APIRouter(prefix="/leaderboard", tags=["leaderboard"])

Period = Literal["all", "daily", "weekly", "monthly", "streak"]


@router.get("/")
async def leaderboard(
    user: OrgActiveUser,
    db: DBSession,
    period: Period = "all",
    limit: int = Query(50, ge=1, le=200),
):
    return await svc.leaderboard(db, period=period, limit=limit, org_id=user.org_id)
