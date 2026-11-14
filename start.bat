@echo off
chcp 65001 >nul
title Ocelot Sign Mod Wiki Server
cd /d "%~dp0"

where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH.
    echo Download from: https://nodejs.org/
    pause
    exit /b 1
)

echo Starting server...
node serve.js
