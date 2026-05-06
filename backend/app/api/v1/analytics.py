from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Query

from app.api.deps import DBSession, OrgActiveUser, OrgModerator
from app.services import analytics as svc

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/me/history")
async def my_history(user: OrgActiveUser, db: DBSession, days: int = Query(30, ge=1, le=365)):
    return await svc.user_history(db, user.id, days)


@router.get("/me/heatmap")
async def my_heatmap(user: OrgActiveUser, db: DBSession, days: int = Query(84, ge=14, le=365)):
    return await svc.heatmap(db, user.id, days)


@router.post("/me/refresh-today")
async def refresh_today(user: OrgActiveUser, db: DBSession):
    """Recompute today's analytics row for the current user."""
    rec = await svc.upsert_daily_for_user(db, user.id, date.today())
    return {
        "date": rec.date.isoformat(),
        "productivity_score": float(rec.productivity_score),
        "discipline_score": float(rec.discipline_score),
        "focus_score": float(rec.focus_score),
        "tasks_approved": rec.tasks_approved,
        "tasks_submitted": rec.tasks_submitted,
        "points_earned": rec.points_earned,
    }


@router.get("/admin/overview")
async def admin_overview(mod: OrgModerator, db: DBSession):
    return await svc.admin_overview(db, org_id=mod.org_id)
