"""Socket.IO server.

Mounted alongside FastAPI under /socket.io. Clients authenticate by passing
a Supabase JWT in the connect auth payload. Rooms:
  - global: every connected client (announcements, leaderboard updates)
  - admins: admin-only events
  - user:{user_id}: per-user events (your submission was approved)
"""

from __future__ import annotations

import uuid
from typing import Any

import socketio
from loguru import logger

from app.core.database import AsyncSessionLocal
from app.core.security import decode_supabase_token
from app.models.user import User, UserRole

sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins="*",
    logger=False,
    engineio_logger=False,
)

socket_app = socketio.ASGIApp(sio, socketio_path="/socket.io")


@sio.event
async def connect(sid: str, environ: dict, auth: dict | None) -> None:  # noqa: ARG001
    token = (auth or {}).get("token")
    if not token:
        logger.warning("Socket connect rejected: no token")
        raise socketio.exceptions.ConnectionRefusedError("auth required")
    try:
        claims = decode_supabase_token(token)
    except Exception as e:
        logger.warning("Socket connect rejected: bad token ({})", e)
        raise socketio.exceptions.ConnectionRefusedError("invalid token") from e

    user_id = claims["sub"]
    role: str | None = None
    try:
        async with AsyncSessionLocal() as db:
            db_user = await db.get(User, uuid.UUID(user_id))
            if db_user:
                role = db_user.role.value
    except Exception as e:
        logger.warning("Socket role lookup failed: {}", e)

    await sio.save_session(sid, {"user_id": user_id, "role": role})
    await sio.enter_room(sid, "global")
    await sio.enter_room(sid, f"user:{user_id}")
    if role == UserRole.ADMIN.value:
        await sio.enter_room(sid, "admins")
    logger.info("Socket connect: user={} role={} sid={}", user_id, role, sid)


@sio.event
async def disconnect(sid: str) -> None:
    logger.info("Socket disconnect: sid={}", sid)


# ---------- emit helpers ----------


async def emit_to_user(user_id: str, event: str, payload: dict[str, Any]) -> None:
    await sio.emit(event, payload, room=f"user:{user_id}")


async def emit_global(event: str, payload: dict[str, Any]) -> None:
    await sio.emit(event, payload, room="global")


async def emit_admins(event: str, payload: dict[str, Any]) -> None:
    await sio.emit(event, payload, room="admins")
