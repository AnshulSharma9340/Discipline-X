"""
DisciplineX — Fast MP4 export.

Strategy:
  Playwright opens each HTML reel in headless Chromium and records the
  visible viewport in REAL TIME (not frame-by-frame), so each 15s reel
  takes ~15-20 seconds to capture instead of ~1 hour with timecut.

  The native recording is WebM. We re-encode to H.264 MP4 at 60 fps with
  ffmpeg so the output is Instagram-ready (1080x1920, yuv420p, faststart).
"""

import asyncio
import os
import shutil
import subprocess
import sys
import time
from pathlib import Path

from playwright.async_api import async_playwright

REELS = [
    "disciplinex-reel.html",
    "reel-2-morning-ritual.html",
    "reel-3-streak-war.html",
    "reel-4-chain.html",
    "reel-5-locked-in.html",
    "reel-6-level-up.html",
]

WIDTH = 1080
HEIGHT = 1920
DURATION_SEC = 15
OUT_FPS = 60

HERE = Path(__file__).parent.resolve()
OUT = HERE / "mp4"
TEMP = HERE / "_recordings"


async def record_reel(reel_name: str) -> Path | None:
    name = Path(reel_name).stem
    html_path = HERE / reel_name
    if not html_path.exists():
        print(f"  [SKIP] {reel_name} not found")
        return None

    t0 = time.time()
    print(f"\n[+] {reel_name}")
    print(f"    recording {DURATION_SEC}s in headless Chromium...")

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=[
                "--disable-frame-rate-limit",
                "--disable-gpu-vsync",
                "--enable-gpu-rasterization",
                "--disable-background-timer-throttling",
                "--disable-backgrounding-occluded-windows",
                "--disable-renderer-backgrounding",
                "--no-sandbox",
                "--autoplay-policy=no-user-gesture-required",
            ],
        )
        context = await browser.new_context(
            viewport={"width": WIDTH, "height": HEIGHT},
            record_video_dir=str(TEMP),
            record_video_size={"width": WIDTH, "height": HEIGHT},
            device_scale_factor=1,
        )
        page = await context.new_page()
        url = html_path.as_uri()
        try:
            await page.goto(url, wait_until="networkidle", timeout=20000)
        except Exception:
            await page.goto(url, timeout=20000)

        # Let Google Fonts and the first frame settle
        try:
            await page.evaluate("document.fonts.ready")
        except Exception:
            pass
        await page.wait_for_timeout(400)

        # Record one full loop
        await page.wait_for_timeout(int(DURATION_SEC * 1000))

        await page.close()
        await context.close()
        await browser.close()

    webms = sorted(TEMP.glob("*.webm"), key=lambda p: p.stat().st_mtime, reverse=True)
    if not webms:
        print("    [ERROR] no webm produced by Playwright")
        return None
    webm = webms[0]

    mp4 = OUT / f"{name}.mp4"
    print(f"    encoding -> {mp4.name} (60 fps H.264)...")
    cmd = [
        "ffmpeg", "-y",
        "-i", str(webm),
        "-c:v", "libx264",
        "-pix_fmt", "yuv420p",
        "-crf", "18",
        "-preset", "medium",
        "-r", str(OUT_FPS),
        "-vf", f"scale={WIDTH}:{HEIGHT}:flags=lanczos",
        "-movflags", "+faststart",
        "-t", str(DURATION_SEC),
        str(mp4),
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"    [ERROR] ffmpeg failed:\n{result.stderr[-400:]}")
        return None

    try:
        webm.unlink()
    except Exception:
        pass

    elapsed = time.time() - t0
    size_mb = mp4.stat().st_size / 1e6
    print(f"    OK   ({size_mb:.1f} MB, {elapsed:.0f}s)")
    return mp4


async def main() -> None:
    print("=" * 55)
    print("  DisciplineX  —  Fast MP4 Export")
    print("=" * 55)
    print(f"  {WIDTH}x{HEIGHT}  ·  {DURATION_SEC}s  ·  {OUT_FPS} fps  ·  H.264")
    print("=" * 55)

    OUT.mkdir(exist_ok=True)
    if TEMP.exists():
        shutil.rmtree(TEMP, ignore_errors=True)
    TEMP.mkdir()

    overall = time.time()
    succeeded = 0
    for reel in REELS:
        try:
            if await record_reel(reel):
                succeeded += 1
        except Exception as e:
            print(f"    [ERROR] {e}")

    shutil.rmtree(TEMP, ignore_errors=True)

    print()
    print("=" * 55)
    print(f"  {succeeded} / {len(REELS)} converted in {time.time() - overall:.0f}s")
    print(f"  MP4 files in:  {OUT}")
    print("=" * 55)


if __name__ == "__main__":
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
    asyncio.run(main())
