from __future__ import annotations

from fastapi import APIRouter

from app.api.deps import OrgActiveUser, DBSession
from app.services.ai import insights

router = APIRouter(prefix="/ai", tags=["ai"])


@router.get("/me/burnout")
async def my_burnout(user: OrgActiveUser, db: DBSession):
    return await insights.burnout_risk(db, user.id)


@router.get("/me/procrastination")
async def my_procrastination(user: OrgActiveUser, db: DBSession):
    return await insights.procrastination_index(db, user.id)


@router.get("/me/forecast")
async def my_forecast(user: OrgActiveUser, db: DBSession):
    return await insights.forecast_next_week(db, user.id)


@router.get("/me/recommendations")
async def my_recommendations(user: OrgActiveUser, db: DBSession):
    return await insights.recommendations(db, user.id)
