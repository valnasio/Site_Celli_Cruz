# Multi-stage build para otimizar imagem
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar package.json e package-lock.json
COPY package*.json ./

# Instalar dependências
RUN npm ci --only=production

# Stage final - imagem menor
FROM node:20-alpine

WORKDIR /app

# Instalar dumb-init e su-exec (para troca de usuário com permissão)
RUN apk add --no-cache dumb-init su-exec

# Copiar node_modules do builder
COPY --from=builder /app/node_modules ./node_modules

# Copiar código da aplicação
COPY . /app

# Criar diretórios necessários
RUN mkdir -p /app/data /app/assets/uploads

# Criar usuário nodejs
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:8000', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Configurar o entrypoint
RUN chmod +x /app/scripts/docker-entrypoint.sh

# Expor porta
EXPOSE 8000

# Usar o script customizado como entrypoint
ENTRYPOINT ["dumb-init", "--", "/app/scripts/docker-entrypoint.sh"]

# Comando padrão
CMD ["node", "server.js"]
