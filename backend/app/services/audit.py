from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit import AuditLog


async def log_action(
    db: AsyncSession,
    *,
    actor_id: uuid.UUID | None,
    action: str,
    target_type: str | None = None,
    target_id: str | None = None,
    metadata: dict[str, Any] | None = None,
    ip: str | None = None,
) -> None:
    db.add(
        AuditLog(
            actor_id=actor_id,
            action=action,
            target_type=target_type,
            target_id=target_id,
            metadata_json=metadata,
            ip=ip,
        )
    )
    await db.commit()
