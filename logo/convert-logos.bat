@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul
title DisciplineX Logos - SVG to PNG

echo.
echo ===================================================
echo   DisciplineX Logos  -  SVG to PNG Converter
echo ===================================================
echo.

cd /d "%~dp0"
set "LOGO=%~dp0"
set "LOGO_URL=%LOGO:\=/%"
set "OUT=%LOGO%png"

REM Locate Microsoft Edge
set "EDGE="
if exist "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" (
  set "EDGE=C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
) else if exist "C:\Program Files\Microsoft\Edge\Application\msedge.exe" (
  set "EDGE=C:\Program Files\Microsoft\Edge\Application\msedge.exe"
)

if "%EDGE%"=="" (
  echo [ERROR] Microsoft Edge not found.
  echo This script uses Edge headless to render the SVGs.
  echo Edge is bundled with Windows 11. If you've removed it, install Chrome
  echo and edit this .bat to point EDGE at chrome.exe instead.
  pause
  exit /b 1
)

if not exist "%OUT%" mkdir "%OUT%"

REM Clean up any previous test files
if exist "%OUT%\_test.png" del "%OUT%\_test.png"

echo  Edge:    %EDGE%
echo  Output:  %OUT%
echo.
echo ---------------------------------------------------

REM ===== icon.svg : 8 standard app-icon sizes =====
echo  icon.svg
for %%S in (16 32 64 128 192 256 512 1024) do call :render "icon" %%S %%S

REM ===== icon-mono-light.svg =====
echo.
echo  icon-mono-light.svg
for %%S in (256 512 1024) do call :render "icon-mono-light" %%S %%S

REM ===== icon-mono-dark.svg =====
echo.
echo  icon-mono-dark.svg
for %%S in (256 512 1024) do call :render "icon-mono-dark" %%S %%S

REM ===== favicon.svg =====
echo.
echo  favicon.svg
for %%S in (16 32 48 64) do call :render "favicon" %%S %%S

REM ===== wordmark.svg (5:1 aspect) =====
echo.
echo  wordmark.svg
call :render "wordmark" 1400 280
call :render "wordmark" 700 140

REM ===== lockup-horizontal.svg (3.75:1 aspect) =====
echo.
echo  lockup-horizontal.svg
call :render "lockup-horizontal" 1800 480
call :render "lockup-horizontal" 900 240

REM ===== lockup-stacked.svg (0.8:1 aspect) =====
echo.
echo  lockup-stacked.svg
call :render "lockup-stacked" 800 1000
call :render "lockup-stacked" 400 500

echo.
echo ---------------------------------------------------
echo  Done!  PNGs are in:  %OUT%
echo ---------------------------------------------------
echo.
echo  Tip:  for a transparent Instagram profile picture,
echo        use  icon-1024x1024.png  ^(or 512^).
echo        For favicon.ico, upload favicon-32x32.png to
echo        https://favicon.io/favicon-converter/
echo.
pause
exit /b 0


REM ====================================================
REM  Subroutine: render <name> <width> <height>
REM ====================================================
:render
set "NAME=%~1"
set "W=%~2"
set "H=%~3"
set "OUTFILE=%OUT%\%NAME%-%W%x%H%.png"
echo    - %NAME%-%W%x%H%.png
"%EDGE%" --headless --disable-gpu --hide-scrollbars --default-background-color=00000000 --window-size=%W%,%H% --screenshot="%OUTFILE%" "file:///%LOGO_URL%%NAME%.svg" >nul 2>&1
exit /b 0
