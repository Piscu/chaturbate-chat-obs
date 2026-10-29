@echo off
setlocal
title Chat Chaturbate - Inicio silencioso
cd /d "%~dp0"

rem Usa el node.exe que viene en la carpeta; si no esta, el del sistema.
set "NODE=%~dp0node.exe"
if not exist "%NODE%" set "NODE=node"

if "%PORT%"=="" set PORT=8017
rem El servidor abre el navegador cuando ya esta escuchando.
set OPEN=1

start "" /min "%NODE%" server.mjs
endlocal
