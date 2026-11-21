@echo off
setlocal
pushd "%~dp0" || goto folder_error
title Bishop Technologies Website

where node >nul 2>&1
if errorlevel 1 goto node_error
node -e "const [major, minor] = process.versions.node.split('.').map(Number); process.exit(Math.sign(major * 1000 + minor - 22013) === -1 ? 1 : 0)"
if errorlevel 1 goto node_error
if exist "dist\index.html" goto start_server
where npm >nul 2>&1
if errorlevel 1 goto node_error

if not exist "node_modules\.bin\vite.cmd" (
  echo Installing Bishop Technologies website dependencies...
  call npm ci --no-audit --no-fund
  if errorlevel 1 goto install_error
)

echo Preparing the Bishop Technologies website...
call npm run build
if errorlevel 1 goto build_error

:start_server
echo.
echo Starting the Bishop Technologies website...
node scripts\local-site.mjs --open
if errorlevel 1 goto server_error
popd
exit /b 0

:node_error
echo Install Node.js 22.13 or newer from https://nodejs.org/ and open START-BISHOP.cmd again.
goto fail
:install_error
echo The dependency download failed. Check your internet connection and open START-BISHOP.cmd again.
goto fail
:build_error
echo The website could not be prepared. The build message above may explain what happened.
goto fail
:server_error
echo The local website stopped. The message above may explain what happened.
:fail
pause
popd
exit /b 1

:folder_error
echo The website folder could not be opened. Extract the entire ZIP before running this file.
pause
exit /b 1
