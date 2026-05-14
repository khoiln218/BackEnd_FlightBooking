#!/bin/bash
echo "[Clean] Xoa cac resource generated..."

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$SCRIPT_DIR/.."

cd "$PROJECT_DIR"

if [ -d "dist" ]; then
  echo "  - Xoa dist/"
  rm -rf dist
fi

if [ -d "node_modules" ]; then
  echo "  - Xoa node_modules/"
  rm -rf node_modules
fi

if [ -d "coverage" ]; then
  echo "  - Xoa coverage/"
  rm -rf coverage
fi

if [ -f "package-lock.json" ]; then
  echo "  - Xoa package-lock.json"
  rm -f package-lock.json
fi

if [ -f "pnpm-lock.yaml" ]; then
  echo "  - Xoa pnpm-lock.yaml"
  rm -f pnpm-lock.yaml
fi

if [ -f ".tsbuildinfo" ]; then
  echo "  - Xoa .tsbuildinfo"
  rm -f .tsbuildinfo
fi

echo "[Clean] Hoan tat!"
echo ""
echo "Chay 'pnpm install' hoac 'npm install' de cai lai dependencies."
