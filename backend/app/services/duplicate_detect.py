"""Perceptual hashing to flag duplicate proof images.

Pure-stdlib implementation: compute a 64-bit pHash by averaging the
8x8 grayscale downscaled image. Hamming distance ≤ 8 = likely duplicate.
"""

from __future__ import annotations

import hashlib
from typing import Iterable


def perceptual_hash(content: bytes) -> str:
    """Lightweight pHash using PIL if available, falling back to SHA-256.

    Returns a 64-char hex string. The first 16 chars are the pHash; the
    remainder is a SHA-256 prefix as tiebreaker for short content.
    """
    try:
        from io import BytesIO

        from PIL import Image

        img = Image.open(BytesIO(content)).convert("L").resize((8, 8), Image.LANCZOS)
        pixels = list(img.getdata())
        avg = sum(pixels) / len(pixels)
        bits = "".join("1" if p > avg else "0" for p in pixels)
        phash_hex = f"{int(bits, 2):016x}"
    except Exception:
        phash_hex = "0" * 16

    sha = hashlib.sha256(content).hexdigest()[:48]
    return phash_hex + sha


def hamming_distance(a: str, b: str) -> int:
    """Hamming distance between the pHash portions (first 16 hex chars)."""
    if not a or not b:
        return 64
    try:
        x = int(a[:16], 16) ^ int(b[:16], 16)
    except ValueError:
        return 64
    return bin(x).count("1")


def find_duplicate(new_hash: str, existing_hashes: Iterable[str], threshold: int = 8) -> str | None:
    """Return the first existing hash within `threshold` Hamming distance, or None."""
    for h in existing_hashes:
        if h and hamming_distance(new_hash, h) <= threshold:
            return h
    return None
