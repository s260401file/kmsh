@echo off
cd /d "%~dp0"
echo ========================================
echo   DbSync test run (tier=fast)
echo ========================================
echo.
DbSync.exe --tier fast
echo.
echo ========================================
echo   Done. exit code = %errorlevel%
echo   (0=all ok  1=some table failed  2=arg error)
echo   details under logs\
echo ========================================
pause
