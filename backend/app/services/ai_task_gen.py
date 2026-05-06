"""Local AI-flavored task generator.

Template-based for now (no external API). Each profile produces a curated
mix of tasks with sensible difficulty/points/proof requirements. Designed
so the API surface matches what a Claude-backed version would produce —
swap out `generate` body when ready.
"""

from __future__ import annotations

import random
from datetime import datetime, timedelta, timezone

PROFILES = {
    "cs_student": [
        ("Solve 3 LeetCode problems (mixed)", "Hard problems count double", "hard", 30, "code_screenshot",
         "Upload screenshots of submissions or paste LeetCode profile link"),
        ("Watch 1 hour of system design", "Take notes", "easy", 15, "notes",
         "Photo of your notes"),
        ("2-hour deep work block", "No phone, no Slack", "medium", 25, "stopwatch",
         "Stopwatch screenshot or focus timer log"),
        ("Read 30 pages technical book", "Any CS-related book", "easy", 10, "image",
         "Photo of last page read"),
        ("Push one commit to a project", "Real, meaningful change", "medium", 20, "github_link",
         "Paste the commit URL"),
    ],
    "fitness": [
        ("60-min strength workout", "Compound lifts only", "medium", 25, "image", "Gym selfie"),
        ("10,000 steps", "All in one shot or accumulated", "easy", 10, "image", "Step counter screenshot"),
        ("Meal prep next 3 days", "Photograph the spread", "medium", 20, "image", "Photo of containers"),
        ("8 hours sleep tonight", "No screens last hour", "easy", 15, "notes", "Note your bedtime + wake time"),
    ],
    "founder": [
        ("Talk to 3 prospects", "Real customer dev calls", "hard", 40, "notes", "Notes from each"),
        ("Ship one feature to prod", "Visible to users", "hard", 50, "github_link", "Deploy URL or commit"),
        ("Write 1 piece of content", "Tweet thread, post, or essay", "medium", 25, "image", "Screenshot of published"),
        ("Review key metrics", "Update internal dashboard", "easy", 15, "notes", "Quick summary"),
        ("Inbox to zero", "Reply or archive", "easy", 10, "image", "Screenshot of empty inbox"),
    ],
    "writer": [
        ("Write 1000 words", "Any project, no editing", "medium", 30, "notes", "Word count screenshot"),
        ("Edit yesterday's draft", "Cut 20% minimum", "medium", 20, "notes", "Diff or before/after"),
        ("Read 30 pages of fiction", "Quality input", "easy", 10, "image", "Photo of book"),
        ("Free-write 15 min", "Stream of consciousness", "easy", 10, "notes", "Word count"),
    ],
    "general": [
        ("Daily review (15 min)", "What worked, what didn't", "easy", 10, "notes", "Brief reflection"),
        ("90-min focus block", "Single most important task", "medium", 25, "stopwatch", "Timer log"),
        ("30-min reading", "Books, not feeds", "easy", 10, "image", "Photo of source"),
        ("Workout (any kind)", "30 min minimum", "medium", 20, "image", "Selfie or gym photo"),
        ("Learn one new thing", "Tutorial, article, video", "easy", 10, "notes", "Quick summary"),
    ],
}


def generate(profile: str = "general", count: int = 5) -> list[dict]:
    pool = PROFILES.get(profile, PROFILES["general"])
    picked = random.sample(pool, min(count, len(pool)))

    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    deadline = today + timedelta(hours=23, minutes=59)

    out: list[dict] = []
    for title, desc, diff, points, _proof_type, proof_instr in picked:
        out.append(
            {
                "title": title,
                "description": desc,
                "difficulty": diff,
                "points": points,
                "is_required": diff in ("hard", "insane") or random.random() < 0.5,
                "proof_required": True,
                "proof_instructions": proof_instr,
                "task_date": today.isoformat(),
                "deadline": deadline.isoformat(),
            }
        )
    return out


async def generate_with_groq(profile: str, count: int, custom_prompt: str = "") -> list[dict] | None:
    """LLM-generated task pack via Groq. Falls back to local templates if Groq returns nothing."""
    from app.services import groq_client

    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    deadline = today + timedelta(hours=23, minutes=59)

    profile_label = profile.replace("_", " ")
    extra = f"\nAdditional admin instructions: {custom_prompt.strip()}" if custom_prompt.strip() else ""

    prompt = f"""Generate {count} daily productivity tasks for a "{profile_label}" user on DisciplineX.{extra}

Each task needs to be specific, measurable, and shippable in one day. Mix difficulty.

Return strict JSON: an array of task objects. Each object MUST have:
- "title": short imperative (under 80 chars)
- "description": 1-2 sentence why/how
- "difficulty": one of "easy", "medium", "hard", "insane"
- "points": integer 5-50 based on difficulty
- "is_required": boolean (true for ~half the items, esp. hard/insane)
- "proof_instructions": short instruction on what proof to upload

Return ONLY the JSON array, no prose."""

    res = await groq_client.chat_json(
        [
            {"role": "system", "content": "You generate productivity tasks. Always reply with a strict JSON array."},
            {"role": "user", "content": prompt},
        ],
        max_tokens=1500,
    )

    if not res:
        return None

    # The model sometimes returns {"tasks": [...]} or directly a list
    items = res if isinstance(res, list) else res.get("tasks") or res.get("items")
    if not isinstance(items, list):
        return None

    out: list[dict] = []
    for item in items[:count]:
        if not isinstance(item, dict):
            continue
        diff = str(item.get("difficulty", "medium")).lower()
        if diff not in ("easy", "medium", "hard", "insane"):
            diff = "medium"
        out.append(
            {
                "title": str(item.get("title", "Untitled task"))[:200],
                "description": str(item.get("description", ""))[:1000],
                "difficulty": diff,
                "points": max(0, min(1000, int(item.get("points", 15)))),
                "is_required": bool(item.get("is_required", diff in ("hard", "insane"))),
                "proof_required": True,
                "proof_instructions": str(item.get("proof_instructions", "Attach proof of completion"))[:500],
                "task_date": today.isoformat(),
                "deadline": deadline.isoformat(),
            }
        )
    return out if out else None
