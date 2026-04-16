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

# Instalar dumb-init para handle de signals
RUN apk add --no-cache dumb-init

# Copiar node_modules do builder
COPY --from=builder /app/node_modules ./node_modules

# Copiar código da aplicação
COPY . /app

# Criar diretórios necessários
RUN mkdir -p /app/data /app/assets/uploads

# Ajustar permissões para o usuário nodejs
RUN chown -R 1001:1001 /app/data /app/assets/uploads && chmod -R 775 /app/data /app/assets/uploads
# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:8000', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Executar como non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
USER nodejs

# Expor porta
EXPOSE 8000

# Usar dumb-init para melhor handling de signals
ENTRYPOINT ["dumb-init", "--"]

# Iniciar servidor
CMD ["node", "server.js"]
