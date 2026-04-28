#!/bin/sh
set -e

# Garante que as pastas de dados e uploads tenham as permissões corretas
# mesmo se o volume montado pela VPS pertencer ao root.
echo "Ajustando permissões de escrita..."
chown -R nodejs:nodejs /app/data /app/assets/uploads
chmod -R 775 /app/data /app/assets/uploads

# Executa o reset do admin automaticamente na inicialização.
# Isso garante que o admin sempre existirá com a senha definida (padrão 'admin').
echo "Verificando/Resetando usuário administrador..."
ADMIN_USER=${ADMIN_USER:-admin}
ADMIN_PASSWORD=${ADMIN_PASSWORD:-admin}

su-exec nodejs node scripts/reset-admin.js "$ADMIN_USER" "$ADMIN_PASSWORD"

# Inicia a aplicação como o usuário nodejs
echo "Iniciando servidor como usuário nodejs..."
exec su-exec nodejs "$@"
