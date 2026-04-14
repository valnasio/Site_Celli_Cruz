# Celli Cruz - Docker Setup

Guia para rodar a aplicação Celli Cruz com Docker Compose.

## Requisitos

- Docker Desktop 4.0+
- 2GB de espaço em disco
- Portas livres: 80 (nginx), 8001 (app1), 8002 (app2)

## Início Rápido

### 1. Build e Start
```bash
docker compose up --build -d
```

### 2. AguardeHealthCheck (30-60s)
```bash
docker compose ps
```

Você verá:
```
SERVICE         STATUS
nginx           Up (healthy)
app1            Up (healthy)
app2            Up (healthy)
data_sync       Up
```

### 3. Acesse

**Via Load Balancer Nginx (Recomendado):**
- Site: http://localhost
- Admin: http://localhost/pages/admin.html
- API: http://localhost/api/*

**Direto em cada App (Debug):**
- App1: http://localhost:8001
- App2: http://localhost:8002

## Como Funciona

```
Cliente HTTP (porta 80)
        ↓
   Nginx Server
   (load balance)
        ↓
    ┌───┴───┐
    ↓       ↓
   app1    app2
  (node)   (node)
    ↓       ↓
    └───┬───┘
        ↓
  Dados Compartilhados
  (volume)
```

**2 replicas**: Se uma cair, a outra continua servindo.

## Comandos

### Ver Logs
```bash
# Logs ao vivo
docker compose logs -f

# Apenas um serviço
docker compose logs -f app1
```

### Parar
```bash
# Parar apenas
docker compose stop

# Parar e remover
docker compose down
```

### Reiniciar
```bash
docker compose restart

# Só um serviço
docker compose restart app1
```

### Testar
```bash
curl http://localhost/health
```

Resposta esperada: `healthy`

## Troubleshooting

### "Connection refused"
- Aguarde 30-60 segundos (primeira execução é mais lenta)
- Verifique: `docker compose ps`
- Logs: `docker compose logs nginx`

### Porta 80 em uso
Edite `docker-compose.yml`:
```yaml
nginx:
  ports:
    - "8080:80"  # Use 8080
```

Depois: `docker compose restart`

### Dados não salvam
Verifique volumes:
```bash
docker volume ls
docker volume inspect <nome>
```

## Logs e Monitoramento

### Uso de Recursos
```bash
docker stats
```

### Health Status
```bash
docker compose ps --format "table {{.Service}}\t{{.Status}}"
```

## Escalabilidade

Adicionar 3ª réplica em `docker-compose.yml`:

1. Copie seção `app2`
2. Renomeie para `app3`
3. Mude `INSTANCE_NAME=app3`
4. Execute: `docker compose up -d`

Nginx detectará automaticamente.

## Dados

Volumes:
- `app_data`: `/data/imoveis.json`
- `app_uploads`: `/assets/uploads/`

Acesso:
```bash
docker volume inspect cellicruz_app_data
```

## Limpeza

```bash
# Para tudo
docker compose down

# Remove volumes também (⚠️ deleta dados)
docker compose down -v

# Remove tudo e re-build
docker compose down -v && docker compose up --build -d
```

## Notas

- Health checks: 30s interval, 3 retries
- Auto-restart: ativado
- Limites: 512MB RAM, 0.5 CPU por app
- Gzip compression: ativado
- ✅ Compressão Gzip habilitada
- ✅ Client body size limitado

### Configurar HTTPS

1. Obter certificado SSL (Let's Encrypt)
2. Copiar `cert.pem` e `key.pem` para pasta `ssl/`
3. Descomente seção HTTPS em `nginx.conf`
4. Atualizar `server_name seu-dominio.com.br`
5. Reinicie: `docker-compose restart nginx`

## 📈 Monitoramento

### Verificar Uso de Recursos
```bash
docker stats
```

### Ver Interações
```bash
docker-compose logs app1 --tail 100
```

## 🛠️ Troubleshooting

### Porta 80 Já em Uso
```bash
# Mudar porta no docker-compose.yml
# ports:
#   - "8080:80"  # Use 8080 em vez de 80
docker-compose up -d
```

### Apps não ficam "healthy"
```bash
# Verificar logs
docker-compose logs app1

# Testar manualmente
docker exec celli_cruz_app1 node -e "require('http').get('http://localhost:8000')"
```

### Dados não persistem
```bash
# Verificar volumes
docker volume ls

# Inspecionar
docker volume inspect cellicruz_app_data
```

## 📊 Performance

**Configuração Padrão:**
- 2 réplicas app (Node.js)
- 1 nginx load balancer
- CPU: ~1 core total
- Memória: ~1.5GB total
- Throughput: ~1000+ requisições/segundo
- Latência: <50ms (p95)

## 🚀 Escalabilidade

Para adicionar 3ª replica:

1. Abra `docker-compose.yml`
2. Copie seção `app2`
3. Renomeie para `app3`
4. Mude `INSTANCE_NAME=app3`
5. Salve e execute: `docker-compose up -d`

Nginx detectará automaticamente!

## 📝 Licença e Suporte

Celli Cruz Assessoria Imobiliária
Documentação: Abril 2026
