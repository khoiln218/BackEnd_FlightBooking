@echo off
REM ============================================================
REM Clean generated/rebuildable resources
REM Xóa các folder/file có thể rebuild từ source
REM ============================================================

echo === Clean generated resources ===
echo.

REM Backend: node_modules + dist
if exist "BE_FlightBooking\node_modules" (
    echo [1/5] Xoa BE_FlightBooking\node_modules...
    rmdir /s /q "BE_FlightBooking\node_modules"
)

if exist "BE_FlightBooking\dist" (
    echo [2/5] Xoa BE_FlightBooking\dist...
    rmdir /s /q "BE_FlightBooking\dist"
)

REM Supabase runtime folders (giữ config.toml)
if exist "BE_FlightBooking\supabase\.branches" (
    echo [3/5] Xoa BE_FlightBooking\supabase\.branches...
    rmdir /s /q "BE_FlightBooking\supabase\.branches"
)

if exist "BE_FlightBooking\supabase\.temp" (
    echo [4/5] Xoa BE_FlightBooking\supabase\.temp...
    rmdir /s /q "BE_FlightBooking\supabase\.temp"
)

REM Public copy folder
if exist "Public_BackEnd_FlightBooking" (
    echo [5/5] Xoa Public_BackEnd_FlightBooking...
    rmdir /s /q "Public_BackEnd_FlightBooking"
)

echo.
echo === Clean hoan tat ===
echo.
echo De rebuild:
echo   cd BE_FlightBooking
echo   npm install
echo   npm run build    (optional, tao dist/)
echo.
echo De chay lai Supabase local:
echo   scripts\supabase-start.bat
