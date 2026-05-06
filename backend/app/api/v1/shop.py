"""XP shop — themes and freeze tokens."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.api.deps import OrgActiveUser, DBSession

router = APIRouter(prefix="/shop", tags=["shop"])

THEMES = {
    "violet": {"name": "Aurora Violet", "cost": 0, "preview": "linear-gradient(135deg,#8b5cf6,#22d3ee)"},
    "pink": {"name": "Vaporwave", "cost": 500, "preview": "linear-gradient(135deg,#ec4899,#8b5cf6)"},
    "lime": {"name": "Matrix", "cost": 1000, "preview": "linear-gradient(135deg,#a3e635,#22d3ee)"},
    "amber": {"name": "Solar Flare", "cost": 2000, "preview": "linear-gradient(135deg,#f59e0b,#ef4444)"},
    "ice": {"name": "Glacier", "cost": 3000, "preview": "linear-gradient(135deg,#22d3ee,#ffffff)"},
    "noir": {"name": "Pure Noir", "cost": 5000, "preview": "linear-gradient(135deg,#1f2937,#000000)"},
}

FREEZE_COST = 250


class PurchasePayload(BaseModel):
    item: str  # theme code or 'freeze_token'


@router.get("/")
async def shop(user: OrgActiveUser):
    unlocked = set(user.unlocked_themes.split(","))
    return {
        "xp": user.xp,
        "freeze_tokens": user.freeze_tokens,
        "current_theme": user.theme,
        "themes": [
            {
                "code": code,
                **info,
                "owned": code in unlocked,
            }
            for code, info in THEMES.items()
        ],
        "freeze_token": {"cost": FREEZE_COST, "name": "Streak Shield", "icon": "🛡️"},
    }


@router.post("/buy")
async def buy(payload: PurchasePayload, user: OrgActiveUser, db: DBSession):
    if payload.item == "freeze_token":
        if user.xp < FREEZE_COST:
            raise HTTPException(400, "Not enough XP")
        user.xp -= FREEZE_COST
        user.freeze_tokens += 1
        await db.commit()
        return {"ok": True, "freeze_tokens": user.freeze_tokens, "xp": user.xp}

    theme = THEMES.get(payload.item)
    if not theme:
        raise HTTPException(404, "Item not found")
    unlocked = set(user.unlocked_themes.split(","))
    if payload.item in unlocked:
        raise HTTPException(400, "Already owned")
    if user.xp < theme["cost"]:
        raise HTTPException(400, "Not enough XP")
    user.xp -= theme["cost"]
    unlocked.add(payload.item)
    user.unlocked_themes = ",".join(sorted(unlocked))
    user.theme = payload.item
    await db.commit()
    return {"ok": True, "theme": user.theme, "xp": user.xp}
