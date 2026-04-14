@echo off
REM Script de inicialização para Windows

echo.
echo ╔═══════════════════════════════════════════════════════════╗
echo ║         🏠 Iniciando Celli Cruz Admin 🏠                 ║
echo ╚═══════════════════════════════════════════════════════════╝
echo.

REM Verificar se node_modules não existe
if not exist "node_modules" (
    echo 📦 Instalando dependências...
    call npm install
    echo.
)

REM Iniciar servidor
echo ▶️  Iniciando servidor Node.js...
echo.
call node server.js
