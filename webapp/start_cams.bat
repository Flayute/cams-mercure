@echo off
TITLE CAMS Preview - Autostart
REM Script para iniciar el ecosistema CAMS automáticamente

echo ==========================================
echo    INICIANDO ECOSISTEMA CAMS
echo ==========================================

echo [1/3] Iniciando Backend Bridge...
start /b node server.js > server_log.txt 2>&1

echo [2/3] Iniciando WebApp Frontend...
start /b npm run dev > frontend_log.txt 2>&1

echo [3/3] Iniciando Navegador...
timeout /t 5 > nul
start http://localhost:5173

echo.
echo Todo listo! Ana te espera en Modo Terapia.
echo Si alguna ventana se cierra, revisa los errores en la terminal.
echo.
pause
