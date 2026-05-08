@echo off
REM Keep-alive script for Supabase free tier (Windows)
REM Ping DB để tránh bị pause sau 7 ngày inactive
REM
REM Tự động chạy bằng Windows Task Scheduler:
REM   1. Open Task Scheduler → Create Basic Task
REM   2. Trigger: Weekly (every 3-5 days)
REM   3. Action: Start a program
REM      Program/script: cmd.exe
REM      Arguments: /c "D:\path\to\BE_FlightBooking\scripts\keep-alive.bat"

cd /d "%~dp0.."
echo Running keep-alive ping...
call npx ts-node scripts/keep-alive.ts
