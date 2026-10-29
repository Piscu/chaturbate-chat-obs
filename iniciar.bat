@echo off
setlocal
title Chat Chaturbate - Fuente OBS
cd /d "%~dp0"

rem Usa el node.exe que viene en la carpeta; si no esta, el del sistema.
set "NODE=%~dp0node.exe"
if not exist "%NODE%" set "NODE=node"

"%NODE%" --version >nul 2>nul
if errorlevel 1 (
  echo.
  echo   No se encontro Node.js.
  echo   Descargalo de https://nodejs.org/ ^(version 18 o superior^)
  echo   o usa el paquete que incluye node.exe.
  echo.
  pause
  exit /b 1
)

if "%PORT%"=="" set PORT=8017
rem El servidor abre el navegador cuando ya esta escuchando.
set OPEN=1

echo.
echo   Iniciando el chat de Chaturbate...
echo.
echo   Deja esta ventana abierta mientras estas en directo.
echo   Para parar, pulsa Ctrl+C o cierra esta ventana.
echo.

"%NODE%" server.mjs
if errorlevel 1 pause
endlocal
