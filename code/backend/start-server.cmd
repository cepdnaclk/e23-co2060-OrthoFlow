@echo off
cd /d "%~dp0"
"C:\Program Files\nodejs\node.exe" src\server.js > server.cmd.log 2>&1
