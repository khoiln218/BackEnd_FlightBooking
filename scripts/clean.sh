#!/bin/bash
# ============================================================
# Clean generated/rebuildable resources
# Xóa các folder/file có thể rebuild từ source
# ============================================================

set -e

echo "=== Clean generated resources ==="
echo ""

# Backend: node_modules + dist
if [ -d "BE_FlightBooking/node_modules" ]; then
    echo "[1/5] Xóa BE_FlightBooking/node_modules..."
    rm -rf BE_FlightBooking/node_modules
fi

if [ -d "BE_FlightBooking/dist" ]; then
    echo "[2/5] Xóa BE_FlightBooking/dist..."
    rm -rf BE_FlightBooking/dist
fi

# Supabase runtime folders (giữ config.toml)
if [ -d "BE_FlightBooking/supabase/.branches" ]; then
    echo "[3/5] Xóa BE_FlightBooking/supabase/.branches..."
    rm -rf BE_FlightBooking/supabase/.branches
fi

if [ -d "BE_FlightBooking/supabase/.temp" ]; then
    echo "[4/5] Xóa BE_FlightBooking/supabase/.temp..."
    rm -rf BE_FlightBooking/supabase/.temp
fi

# Public copy folder
if [ -d "Public_BackEnd_FlightBooking" ]; then
    echo "[5/5] Xóa Public_BackEnd_FlightBooking..."
    rm -rf Public_BackEnd_FlightBooking
fi

echo ""
echo "=== Clean hoàn tất ==="
echo ""
echo "Để rebuild:"
echo "  cd BE_FlightBooking"
echo "  npm install"
echo "  npm run build    (optional, tạo dist/)"
echo ""
echo "Để chạy lại Supabase local:"
echo "  scripts/supabase-start.bat (Windows) hoặc scripts/supabase-start.sh (Linux/Mac)"
