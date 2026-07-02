@echo off
cd /d "%~dp0"
echo ========================================
echo   Inspect DB2 primary/unique keys (read-only)
echo ========================================
echo.
DbSync.exe --inspect-keys
echo.
echo ========================================
echo   Done. exit code = %errorlevel%
echo   (result is also written under logs\ )
echo ========================================
pause
