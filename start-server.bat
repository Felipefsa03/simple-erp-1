@echo off
REM LuminaFlow Server Startup Script for Windows
REM Auto-restart on crash

set SERVER_CMD=node backend\server.mjs
set MAX_RESTARTS=10
set RESTART_COUNT=0
set RESTART_DELAY=3000

echo Starting LuminaFlow Server...
echo =============================

:START
set /a RESTART_COUNT+=1

if %RESTART_COUNT% GTR %MAX_RESTARTS% (
    echo Max restarts reached. Stopping.
    goto :END
)

echo [Server] Starting (attempt %RESTART_COUNT%/%MAX_RESTARTS%)...

%SERVER_CMD%
set EXIT_CODE=%ERRORLEVEL%

if %EXIT_CODE% EQU 0 (
    echo [Server] Clean exit. Stopping auto-restart.
    goto :END
)

echo [Server] Crash detected (exit code: %EXIT_CODE%). Restarting in %RESTART_DELAY%ms...
timeout /t %RESTART_DELAY% /nobreak >nul
goto :START

:END
echo Server stopped.
pause
