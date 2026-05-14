@echo off
echo [Clean] Xoa cac resource generated...

if exist "%~dp0..\dist" (
  echo   - Xoa dist/
  rmdir /s /q "%~dp0..\dist"
)

if exist "%~dp0..\node_modules" (
  echo   - Xoa node_modules/
  rmdir /s /q "%~dp0..\node_modules"
)

if exist "%~dp0..\coverage" (
  echo   - Xoa coverage/
  rmdir /s /q "%~dp0..\coverage"
)

if exist "%~dp0..\package-lock.json" (
  echo   - Xoa package-lock.json
  del /q "%~dp0..\package-lock.json"
)

if exist "%~dp0..\pnpm-lock.yaml" (
  echo   - Xoa pnpm-lock.yaml
  del /q "%~dp0..\pnpm-lock.yaml"
)

if exist "%~dp0..\.tsbuildinfo" (
  echo   - Xoa .tsbuildinfo
  del /q "%~dp0..\.tsbuildinfo"
)

echo [Clean] Hoan tat!
echo.
echo Chay "pnpm install" hoac "npm install" de cai lai dependencies.
