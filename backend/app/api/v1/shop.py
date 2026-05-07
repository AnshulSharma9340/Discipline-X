"""XP shop — themes, boosters, shields, profile titles, avatar frames."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.api.deps import OrgActiveUser, DBSession

router = APIRouter(prefix="/shop", tags=["shop"])


# ---------- Catalog ----------

THEMES: dict[str, dict] = {
    "violet":     {"name": "Aurora Violet", "cost": 0,    "preview": "linear-gradient(135deg,#8b5cf6,#22d3ee)",                "accent": "#8b5cf6", "tier": "common",   "blurb": "The signature shimmer."},
    "pink":       {"name": "Vaporwave",     "cost": 500,  "preview": "linear-gradient(135deg,#ec4899,#8b5cf6 50%,#22d3ee)",     "accent": "#ec4899", "tier": "common",   "blurb": "Late-night neon arcade."},
    "lime":       {"name": "Matrix",        "cost": 1000, "preview": "linear-gradient(135deg,#0f0,#022 70%,#000)",              "accent": "#a3e635", "tier": "rare",     "blurb": "Wake up, Neo."},
    "amber":      {"name": "Solar Flare",   "cost": 2000, "preview": "linear-gradient(135deg,#fde047,#f59e0b 50%,#ef4444)",     "accent": "#f59e0b", "tier": "rare",     "blurb": "Burn brighter."},
    "ice":        {"name": "Glacier",       "cost": 3000, "preview": "linear-gradient(135deg,#ffffff,#22d3ee 50%,#1e3a8a)",     "accent": "#22d3ee", "tier": "epic",     "blurb": "Cool, calm, focused."},
    "cyberpunk":  {"name": "Cyberpunk 2099","cost": 4000, "preview": "linear-gradient(135deg,#fde047,#ec4899 40%,#8b5cf6 80%,#0a0a23)", "accent": "#fde047", "tier": "epic", "blurb": "Wires & fluorescence."},
    "noir":       {"name": "Pure Noir",     "cost": 5000, "preview": "linear-gradient(135deg,#1f2937,#000000)",                  "accent": "#ffffff", "tier": "epic",     "blurb": "Less is more."},
    "sunset":     {"name": "Tokyo Sunset",  "cost": 6000, "preview": "linear-gradient(135deg,#0f172a 0%,#7c3aed 35%,#ec4899 65%,#f59e0b)", "accent": "#f97316", "tier": "legendary", "blurb": "Skyline at golden hour."},
    "mythic":     {"name": "Mythic Prism",  "cost": 9000, "preview": "linear-gradient(135deg,#22d3ee,#a855f7 25%,#ec4899 50%,#f59e0b 75%,#84cc16)", "accent": "#a855f7", "tier": "mythic", "blurb": "All five elements at once."},
}

# Profile titles displayed on profile + leaderboard.
TITLES: dict[str, dict] = {
    "early_riser":  {"name": "Early Riser",   "cost": 800,  "tier": "common", "blurb": "First in, last to quit."},
    "iron_will":    {"name": "Iron Will",     "cost": 1500, "tier": "rare",   "blurb": "For the unyielding."},
    "night_owl":    {"name": "Night Owl",     "cost": 1500, "tier": "rare",   "blurb": "Burned the midnight oil."},
    "code_wizard":  {"name": "Code Wizard",   "cost": 2500, "tier": "epic",   "blurb": "Bends compilers to your will."},
    "marathoner":   {"name": "The Marathoner","cost": 3500, "tier": "epic",   "blurb": "30-day streak veteran."},
    "ascendant":    {"name": "Ascendant",     "cost": 6000, "tier": "legendary", "blurb": "Reserved for the relentless."},
    "mythic_one":   {"name": "The Mythic",    "cost": 12000,"tier": "mythic", "blurb": "Whispered, never spoken."},
}

# Avatar frames — vanity glow rings around the user's avatar.
FRAMES: dict[str, dict] = {
    "violet_ring": {"name": "Violet Halo", "cost": 600,  "tier": "common", "preview": "from-violet-400 via-fuchsia-400 to-cyan-400", "blurb": "A subtle violet halo."},
    "gold_ring":   {"name": "Gilded",      "cost": 2000, "tier": "rare",   "preview": "from-amber-200 via-amber-400 to-yellow-600",   "blurb": "Pure 24-karat focus."},
    "plasma":      {"name": "Plasma",      "cost": 3500, "tier": "epic",   "preview": "from-cyan-300 via-fuchsia-500 to-violet-600",  "blurb": "Crackling with energy."},
    "mythic_ring": {"name": "Mythic Aura", "cost": 7500, "tier": "mythic", "preview": "from-emerald-300 via-cyan-400 via-violet-500 to-pink-500", "blurb": "Earned, never bought lightly."},
}

# Streak protection consumables.
SHIELDS: dict[str, dict] = {
    "freeze_token":  {"name": "Streak Shield",  "cost": 250, "grants": 1, "tier": "common", "blurb": "Protects one day of streak."},
    "mega_shield":   {"name": "Mega Shield ×3", "cost": 600, "grants": 3, "tier": "rare",   "blurb": "Three shields for the price of 2.4."},
    "fortress":      {"name": "Fortress ×7",    "cost": 1300,"grants": 7, "tier": "epic",   "blurb": "Bulk insurance — week-long peace of mind."},
}

# XP boosters — temporary multipliers on awarded points.
BOOSTERS: dict[str, dict] = {
    "boost_2x_24h":   {"name": "Double XP — 24 hours", "cost": 1500, "multiplier": 2.0, "hours": 24,  "tier": "rare",   "blurb": "Every approved task pays double for a day."},
    "boost_15x_72h":  {"name": "1.5× XP — 3 days",     "cost": 3000, "multiplier": 1.5, "hours": 72,  "tier": "epic",   "blurb": "A long, steady tailwind."},
    "boost_3x_6h":    {"name": "Power Hour ×3 (6h)",   "cost": 2200, "multiplier": 3.0, "hours": 6,   "tier": "epic",   "blurb": "Triple XP for one focused sprint."},
    "boost_2x_week":  {"name": "Weekend Warrior — 7d", "cost": 5000, "multiplier": 2.0, "hours": 168, "tier": "legendary", "blurb": "Double XP for an entire week."},
}


# ---------- Helpers ----------

def _split(csv: str) -> set[str]:
    return {x for x in (csv or "").split(",") if x}


def _join(items: set[str]) -> str:
    return ",".join(sorted(items))


def _serialize_themes(user) -> list[dict]:
    unlocked = _split(user.unlocked_themes) | {"violet"}
    return [
        {"code": code, **info, "owned": code in unlocked, "active": user.theme == code}
        for code, info in THEMES.items()
    ]


def _serialize_titles(user) -> list[dict]:
    inv = _split(user.inventory)
    return [
        {"code": code, **info, "owned": f"title:{code}" in inv, "active": user.active_title == code}
        for code, info in TITLES.items()
    ]


def _serialize_frames(user) -> list[dict]:
    inv = _split(user.inventory)
    return [
        {"code": code, **info, "owned": f"frame:{code}" in inv, "active": user.active_frame == code}
        for code, info in FRAMES.items()
    ]


def _serialize_shields() -> list[dict]:
    return [{"code": code, **info} for code, info in SHIELDS.items()]


def _serialize_boosters(user) -> list[dict]:
    now = datetime.now(timezone.utc)
    active = bool(user.xp_boost_until and user.xp_boost_until > now)
    return [
        {"code": code, **info, "is_active_boost": active}
        for code, info in BOOSTERS.items()
    ]


def _active_boost(user) -> dict | None:
    now = datetime.now(timezone.utc)
    if not user.xp_boost_until or user.xp_boost_until <= now:
        return None
    return {
        "multiplier": user.xp_boost_multiplier,
        "expires_at": user.xp_boost_until.isoformat(),
        "seconds_left": int((user.xp_boost_until - now).total_seconds()),
    }


# ---------- Schemas ----------

class PurchasePayload(BaseModel):
    item: str  # theme code, freeze_token, mega_shield, boost_*, title:<code>, frame:<code>


class EquipPayload(BaseModel):
    kind: str  # "theme" | "title" | "frame"
    code: str  # use empty string to unequip a title/frame


# ---------- Routes ----------

@router.get("/")
async def shop(user: OrgActiveUser):
    return {
        "xp": user.xp,
        "freeze_tokens": user.freeze_tokens,
        "current_theme": user.theme,
        "active_title": user.active_title,
        "active_frame": user.active_frame,
        "active_boost": _active_boost(user),
        "themes": _serialize_themes(user),
        "titles": _serialize_titles(user),
        "frames": _serialize_frames(user),
        "shields": _serialize_shields(),
        "boosters": _serialize_boosters(user),
    }


@router.post("/buy")
async def buy(payload: PurchasePayload, user: OrgActiveUser, db: DBSession):
    item = payload.item

    # Streak shields ------------------------------------------------------
    if item in SHIELDS:
        info = SHIELDS[item]
        if user.xp < info["cost"]:
            raise HTTPException(400, "Not enough XP")
        user.xp -= info["cost"]
        user.freeze_tokens += info["grants"]
        await db.commit()
        return {"ok": True, "kind": "shield", "freeze_tokens": user.freeze_tokens, "xp": user.xp}

    # XP boosters ---------------------------------------------------------
    if item in BOOSTERS:
        info = BOOSTERS[item]
        if user.xp < info["cost"]:
            raise HTTPException(400, "Not enough XP")
        now = datetime.now(timezone.utc)
        # Stacks the new duration onto whatever boost is already running, but
        # uses the higher multiplier so users can't downgrade by mistake.
        current_end = user.xp_boost_until if user.xp_boost_until and user.xp_boost_until > now else now
        user.xp_boost_until = current_end + timedelta(hours=info["hours"])
        user.xp_boost_multiplier = max(user.xp_boost_multiplier or 1.0, float(info["multiplier"]))
        user.xp -= info["cost"]
        await db.commit()
        return {"ok": True, "kind": "boost", "xp": user.xp, "active_boost": _active_boost(user)}

    # Themes --------------------------------------------------------------
    if item in THEMES:
        theme = THEMES[item]
        unlocked = _split(user.unlocked_themes) | {"violet"}
        if item in unlocked:
            # Re-purchasing a theme equips it.
            user.theme = item
            await db.commit()
            return {"ok": True, "kind": "theme", "theme": user.theme, "xp": user.xp}
        if user.xp < theme["cost"]:
            raise HTTPException(400, "Not enough XP")
        user.xp -= theme["cost"]
        unlocked.add(item)
        user.unlocked_themes = _join(unlocked)
        user.theme = item
        await db.commit()
        return {"ok": True, "kind": "theme", "theme": user.theme, "xp": user.xp}

    # Titles --------------------------------------------------------------
    if item.startswith("title:"):
        code = item.split(":", 1)[1]
        info = TITLES.get(code)
        if not info:
            raise HTTPException(404, "Title not found")
        inv = _split(user.inventory)
        key = f"title:{code}"
        if key not in inv:
            if user.xp < info["cost"]:
                raise HTTPException(400, "Not enough XP")
            user.xp -= info["cost"]
            inv.add(key)
            user.inventory = _join(inv)
        user.active_title = code
        await db.commit()
        return {"ok": True, "kind": "title", "active_title": user.active_title, "xp": user.xp}

    # Frames --------------------------------------------------------------
    if item.startswith("frame:"):
        code = item.split(":", 1)[1]
        info = FRAMES.get(code)
        if not info:
            raise HTTPException(404, "Frame not found")
        inv = _split(user.inventory)
        key = f"frame:{code}"
        if key not in inv:
            if user.xp < info["cost"]:
                raise HTTPException(400, "Not enough XP")
            user.xp -= info["cost"]
            inv.add(key)
            user.inventory = _join(inv)
        user.active_frame = code
        await db.commit()
        return {"ok": True, "kind": "frame", "active_frame": user.active_frame, "xp": user.xp}

    raise HTTPException(404, "Item not found")


@router.post("/equip")
async def equip(payload: EquipPayload, user: OrgActiveUser, db: DBSession):
    """Equip an already-owned theme / title / frame, or pass an empty code to unequip."""
    inv = _split(user.inventory)

    if payload.kind == "theme":
        unlocked = _split(user.unlocked_themes) | {"violet"}
        if payload.code not in unlocked:
            raise HTTPException(400, "Theme not owned")
        user.theme = payload.code

    elif payload.kind == "title":
        if payload.code and f"title:{payload.code}" not in inv:
            raise HTTPException(400, "Title not owned")
        user.active_title = payload.code

    elif payload.kind == "frame":
        if payload.code and f"frame:{payload.code}" not in inv:
            raise HTTPException(400, "Frame not owned")
        user.active_frame = payload.code

    else:
        raise HTTPException(400, "Unknown kind")

    await db.commit()
    return {"ok": True, "theme": user.theme, "active_title": user.active_title, "active_frame": user.active_frame}
