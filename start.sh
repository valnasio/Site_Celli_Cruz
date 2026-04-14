#!/bin/bash

echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║         🏠 Iniciando Celli Cruz Admin 🏠                 ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

# Verificar se node_modules não existe
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependências..."
    npm install
    echo ""
fi

# Iniciar servidor
echo "▶️  Iniciando servidor Node.js..."
echo ""
node server.js
