@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul
title DisciplineX Reels - HTML to MP4

echo.
echo ===================================================
echo   DisciplineX Reels  -  HTML to MP4 Converter
echo ===================================================
echo.

cd /d "%~dp0"

REM ---------- Check prerequisites ----------
set "MISSING="

where node >nul 2>nul
if errorlevel 1 set "MISSING=!MISSING! Node.js"

where ffmpeg >nul 2>nul
if errorlevel 1 set "MISSING=!MISSING! ffmpeg"

if defined MISSING (
  echo [ERROR] Missing prerequisites:!MISSING!
  echo.
  echo Install these once, then re-run this script:
  echo.
  echo   Node.js  ^=^>  https://nodejs.org/   ^(install the LTS version^)
  echo   ffmpeg   ^=^>  open PowerShell as Admin, then run:
  echo                 winget install ffmpeg
  echo.
  echo After installing, CLOSE this window and double-click the .bat again.
  echo.
  pause
  exit /b 1
)

echo  [1/3] Node.js and ffmpeg detected.
echo.

REM ---------- Install timecut if missing ----------
where timecut >nul 2>nul
if errorlevel 1 (
  echo  [2/3] Installing timecut globally ^(one-time, ^~1 min^)...
  call npm install -g timecut
  if errorlevel 1 (
    echo.
    echo [ERROR] Failed to install timecut. Try running this .bat as Administrator.
    pause
    exit /b 1
  )
  echo.
) else (
  echo  [2/3] timecut already installed.
  echo.
)

REM ---------- Output folder ----------
if not exist "mp4" mkdir "mp4"

echo  [3/3] Converting reels  ^(1080x1920, 15s, 60fps^)
echo        Output folder:  %~dp0mp4\
echo.

REM ---------- File list ----------
set "FILES=disciplinex-reel.html reel-2-morning-ritual.html reel-3-streak-war.html reel-4-chain.html reel-5-locked-in.html reel-6-level-up.html"

set COUNT=0
set FAILED=0
for %%F in (%FILES%) do (
  if exist "%%F" (
    set /a COUNT+=1
    echo ---------------------------------------------------
    echo  [!COUNT!]  %%F
    echo ---------------------------------------------------
    call timecut "%%F" --viewport=1080,1920 --fps=60 --duration=15 --output="mp4\%%~nF.mp4"
    if errorlevel 1 (
      set /a FAILED+=1
      echo  [WARN] %%F failed to render.
    )
    echo.
  ) else (
    echo  [SKIP] %%F not found.
  )
)

echo.
echo ===================================================
if !FAILED! GTR 0 (
  echo   Finished with !FAILED! failure^(s^).
) else (
  echo   All done. MP4s are in:  %~dp0mp4\
)
echo ===================================================
echo.
echo Tip: each MP4 is exactly 15.0 seconds, 1080x1920 ^(9:16^),
echo       ready to upload directly to Instagram Reels.
echo.
pause
