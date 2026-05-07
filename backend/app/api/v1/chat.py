"""Organization chat — group messaging within an org."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api.deps import DBSession, OrgActiveUser
from app.models.chat import ChatMessage
from app.services.realtime import emit_to_room

router = APIRouter(prefix="/chat", tags=["chat"])


class MessageCreate(BaseModel):
    body: str = Field(..., min_length=1, max_length=2000)


def _serialize(m: ChatMessage) -> dict:
    u = m.user
    return {
        "id": str(m.id),
        "org_id": str(m.org_id),
        "user_id": str(m.user_id) if m.user_id else None,
        "user_name": (u.name if u else None) or (u.email.split("@")[0] if u else "deleted user"),
        "avatar_url": u.avatar_url if u else None,
        # Cosmetics so other people see the buyer's flair on every message.
        "active_title": u.active_title if u else "",
        "active_frame": u.active_frame if u else "",
        "user_level": u.level if u else None,
        "body": m.body,
        "created_at": m.created_at.isoformat(),
    }


@router.get("/")
async def list_messages(
    user: OrgActiveUser,
    db: DBSession,
    limit: int = Query(50, ge=1, le=200),
    before: datetime | None = None,
):
    """Most recent messages first (descending). Use `before` for pagination."""
    stmt = (
        select(ChatMessage)
        .where(ChatMessage.org_id == user.org_id, ChatMessage.deleted_at.is_(None))
        .options(selectinload(ChatMessage.user))
        .order_by(ChatMessage.created_at.desc())
        .limit(limit)
    )
    if before:
        stmt = stmt.where(ChatMessage.created_at < before)
    rows = (await db.scalars(stmt)).all()
    # Return ASC for natural chat display
    return [_serialize(m) for m in reversed(rows)]


@router.post("/", status_code=status.HTTP_201_CREATED)
async def post_message(payload: MessageCreate, user: OrgActiveUser, db: DBSession):
    body = payload.body.strip()
    if not body:
        raise HTTPException(400, "Empty message")

    m = ChatMessage(org_id=user.org_id, user_id=user.id, body=body)
    db.add(m)
    await db.commit()
    # Reload with user for serialization
    await db.refresh(m, attribute_names=["user"])

    serialized = _serialize(m)
    await emit_to_room(f"org:{user.org_id}", "chat:new", serialized)
    return serialized


@router.delete("/{msg_id}", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
async def delete_message(msg_id: uuid.UUID, user: OrgActiveUser, db: DBSession):
    m = await db.get(ChatMessage, msg_id)
    if not m or m.org_id != user.org_id:
        raise HTTPException(404, "Message not found")
    # Only author or org owner/moderator can delete
    if m.user_id != user.id and user.org_role not in ("owner", "moderator"):
        raise HTTPException(403, "Not allowed")
    m.deleted_at = datetime.now(timezone.utc)
    await db.commit()
    await emit_to_room(f"org:{user.org_id}", "chat:deleted", {"id": str(m.id)})
