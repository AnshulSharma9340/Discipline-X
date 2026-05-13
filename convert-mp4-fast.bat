@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul
title DisciplineX - Fast MP4 Export

cd /d "%~dp0"

echo.
echo ===================================================
echo   DisciplineX  -  Fast MP4 Export
echo ===================================================
echo.

REM ---------- Locate Python ----------
set "PY="
where py >nul 2>nul && set "PY=py -3"
if "!PY!"=="" (
  where python >nul 2>nul && set "PY=python"
)
if "!PY!"=="" (
  echo [ERROR] Python not found.
  echo Install from https://www.python.org/  ^(check "Add to PATH" during install^)
  pause & exit /b 1
)

REM ---------- Check ffmpeg ----------
where ffmpeg >nul 2>nul
if errorlevel 1 (
  echo [ERROR] ffmpeg not found on PATH.
  pause & exit /b 1
)

echo  [1/3] Python and ffmpeg detected.
echo.

REM ---------- Install playwright if missing ----------
%PY% -c "import playwright" >nul 2>nul
if errorlevel 1 (
  echo  [2/3] Installing playwright python package ^(one-time^)...
  %PY% -m pip install --upgrade pip --quiet
  %PY% -m pip install playwright
  if errorlevel 1 (
    echo [ERROR] pip install playwright failed.
    pause & exit /b 1
  )
) else (
  echo  [2/3] playwright already installed.
)

REM ---------- Install Chromium browser binary ----------
echo  [3/3] Ensuring Chromium browser is available...
%PY% -m playwright install chromium
echo.

REM ---------- Run the conversion ----------
%PY% convert-mp4-fast.py

echo.
pause
