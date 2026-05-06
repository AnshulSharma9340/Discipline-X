"""Groq API client.

Wraps the OpenAI-compatible Groq endpoint. Returns None on any failure or
when no API key is configured — callers fall back to local generation.
"""

from __future__ import annotations

import json
from typing import Any

import httpx
from loguru import logger

from app.core.config import settings

GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"


async def chat(
    messages: list[dict[str, str]],
    *,
    temperature: float = 0.7,
    max_tokens: int = 400,
    json_mode: bool = False,
) -> str | None:
    """Send a chat completion. Returns content string or None on failure."""
    if not settings.groq_enabled:
        return None

    payload: dict[str, Any] = {
        "model": settings.GROQ_MODEL,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }
    if json_mode:
        payload["response_format"] = {"type": "json_object"}

    headers = {
        "Authorization": f"Bearer {settings.GROQ_API_KEY}",
        "Content-Type": "application/json",
    }

    try:
        async with httpx.AsyncClient(timeout=20) as c:
            r = await c.post(GROQ_URL, headers=headers, json=payload)
            if r.status_code >= 400:
                logger.warning("Groq error {}: {}", r.status_code, r.text[:200])
                return None
            data = r.json()
            return data["choices"][0]["message"]["content"]
    except Exception as e:
        logger.warning("Groq request failed: {}", e)
        return None


async def chat_json(messages: list[dict[str, str]], *, max_tokens: int = 800) -> dict | list | None:
    raw = await chat(messages, max_tokens=max_tokens, json_mode=True)
    if not raw:
        return None
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        logger.warning("Groq returned non-JSON response despite json_mode")
        return None
