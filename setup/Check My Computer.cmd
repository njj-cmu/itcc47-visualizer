@echo off
REM Double-click this file to check whether your computer is ready for ITCC47.
REM
REM Windows opens .ps1 files in Notepad when you double-click them, which is why
REM this wrapper exists. -NoProfile skips any personal PowerShell customisation
REM and -ExecutionPolicy Bypass applies to this one run only; nothing about your
REM computer's settings is changed.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0doctor.ps1"

echo.
pause
