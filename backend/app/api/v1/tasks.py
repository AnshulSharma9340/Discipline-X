"""Task endpoints — org-scoped.

Org owner/moderator: full CRUD over their org's tasks.
Org member: list today's tasks (with my submission status), get one.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api.deps import DBSession, OrgActiveUser, OrgModerator
from app.models.submission import SubmissionStatus, TaskSubmission
from app.models.task import DailyTask
from app.schemas.submission import SubmissionPublic
from app.schemas.task import TaskCreate, TaskPublic, TaskUpdate

router = APIRouter(prefix="/tasks", tags=["tasks"])


# ---------- Org admin/moderator: CRUD ----------


@router.post("/", response_model=TaskPublic, status_code=status.HTTP_201_CREATED)
async def create_task(payload: TaskCreate, mod: OrgModerator, db: DBSession) -> TaskPublic:
    task = DailyTask(**payload.model_dump(), created_by=mod.id, org_id=mod.org_id)
    db.add(task)
    await db.commit()
    await db.refresh(task)
    return TaskPublic.model_validate(task)


@router.patch("/{task_id}", response_model=TaskPublic)
async def update_task(
    task_id: uuid.UUID, payload: TaskUpdate, mod: OrgModerator, db: DBSession
) -> TaskPublic:
    task = await db.get(DailyTask, task_id)
    if not task or task.org_id != mod.org_id:
        raise HTTPException(404, "Task not found in your organization")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(task, k, v)
    await db.commit()
    await db.refresh(task)
    return TaskPublic.model_validate(task)


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
async def delete_task(task_id: uuid.UUID, mod: OrgModerator, db: DBSession) -> None:
    task = await db.get(DailyTask, task_id)
    if not task or task.org_id != mod.org_id:
        raise HTTPException(404, "Task not found in your organization")
    await db.delete(task)
    await db.commit()


@router.get("/", response_model=list[TaskPublic])
async def list_tasks(
    db: DBSession,
    mod: OrgModerator,
    date: str | None = None,
    include_archived: bool = False,
) -> list[TaskPublic]:
    stmt = (
        select(DailyTask)
        .where(DailyTask.org_id == mod.org_id)
        .order_by(DailyTask.task_date.desc(), DailyTask.created_at.desc())
    )
    if not include_archived:
        stmt = stmt.where(DailyTask.is_archived.is_(False))
    if date:
        day = datetime.fromisoformat(date).replace(tzinfo=timezone.utc)
        end = day + timedelta(days=1)
        stmt = stmt.where(DailyTask.task_date >= day, DailyTask.task_date < end)
    rows = (await db.scalars(stmt)).all()
    return [TaskPublic.model_validate(r) for r in rows]


# ---------- Org member: today's tasks ----------


def _today_window() -> tuple[datetime, datetime]:
    now = datetime.now(timezone.utc)
    start = datetime(now.year, now.month, now.day, tzinfo=timezone.utc)
    return start, start + timedelta(days=1)


@router.get("/today", response_model=list[TaskPublic])
async def today_tasks(user: OrgActiveUser, db: DBSession) -> list[TaskPublic]:
    start, end = _today_window()
    stmt = (
        select(DailyTask)
        .where(
            DailyTask.org_id == user.org_id,
            DailyTask.is_archived.is_(False),
            DailyTask.task_date >= start,
            DailyTask.task_date < end,
        )
        .order_by(DailyTask.deadline.asc())
    )
    rows = (await db.scalars(stmt)).all()
    return [TaskPublic.model_validate(r) for r in rows]


@router.get("/today/with-status", response_model=list[dict])
async def today_with_my_status(user: OrgActiveUser, db: DBSession) -> list[dict]:
    start, end = _today_window()
    stmt = (
        select(DailyTask)
        .where(
            DailyTask.org_id == user.org_id,
            DailyTask.is_archived.is_(False),
            DailyTask.task_date >= start,
            DailyTask.task_date < end,
        )
        .options(selectinload(DailyTask.submissions))
        .order_by(DailyTask.deadline.asc())
    )
    tasks = (await db.scalars(stmt)).all()

    out: list[dict] = []
    for t in tasks:
        mine = next((s for s in t.submissions if s.user_id == user.id), None)
        out.append(
            {
                "task": TaskPublic.model_validate(t).model_dump(mode="json"),
                "submission": SubmissionPublic.model_validate(mine).model_dump(mode="json")
                if mine
                else None,
            }
        )
    return out


@router.get("/{task_id}", response_model=TaskPublic)
async def get_task(task_id: uuid.UUID, user: OrgActiveUser, db: DBSession) -> TaskPublic:
    task = await db.get(DailyTask, task_id)
    if not task or task.org_id != user.org_id:
        raise HTTPException(404, "Task not found")
    return TaskPublic.model_validate(task)


_ = SubmissionStatus
_ = TaskSubmission
