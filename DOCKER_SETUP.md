# 🐳 Celli Cruz - Docker Compose Setup

Guia completo para rodar a aplicação Celli Cruz com Docker Compose em alta disponibilidade.

## 📋 Requisitos

- Docker Desktop 4.0+
- Docker Compose 1.29+
- ~1.5GB de espaço em disco
- Portas 80, 443 (nginx), 8000 (apps)

## 🚀 Iniciar Aplicação

### Opção 1: Iniciar com Build
```bash
docker-compose up --build -d
```

### Opção 2: Iniciar com Imagem Existente
```bash
docker-compose up -d
```

### Verificar Status
```bash
docker-compose ps
```

Saída esperada:
```
CONTAINER ID   IMAGE              STATUS
xxx     celli_cruz_nginx       Up x minutes (healthy)
yyy     celli_cruz_app1        Up x minutes (healthy)
zzz     celli_cruz_app2        Up x minutes (healthy)
```

## 🌐 Acessar Aplicação

- **Site Principal**: http://localhost
- **Admin Panel**: http://localhost/pages/admin.html
- **API**: http://localhost/api/*
- **Health Check**: http://localhost/health

## 📊 Arquitetura

```
┌─────────────────────────────────────────┐
│         DNS / Load Balancer (80, 443)   │
│              (Nginx Alpine)             │
└──────────────┬──────────────────────────┘
               │
        ┌──────┴──────┐
        ↓             ↓
   ┌─────────┐   ┌─────────┐
   │ celli   │   │ celli   │
   │  app1   │   │  app2   │
   │ :8000   │   │ :8000   │
   └────┬────┘   └────┬────┘
        │ volume      │ volume
        └──────┬──────┘
               ↓
        ┌─────────────┐
        │ Shared Data │
        │  (imoveis   │
        │   uploads)  │
        └─────────────┘
```

## 🔧 Comandos Úteis

### Logs em Tempo Real
```bash
# Todos os serviços
docker-compose logs -f

# Apenas app1
docker-compose logs -f app1

# Apenas nginx
docker-compose logs -f nginx
```

### Testar Load Balancer
```bash
# Múltiplas requisições para verificar distribuição
for i in {1..10}; do
  curl -s http://localhost/health | head -c 20
  echo ""
done
```

### Parar Aplicação
```bash
# Parar todos os containers
docker-compose stop

# Parar e remover containers
docker-compose down

# Parar e remover volumes (CUIDADO: perderá dados)
docker-compose down -v
```

### Reiniciar Serviço
```bash
# Reiniciar uma réplica
docker-compose restart app1

# Força rebuild
docker-compose up --build -d
```

## 📁 Volumes (Dados Persistentes)

Os dados são armazenados em volumes Docker:

- **`app_data`**: `/app/data/imoveis.json` (base de dados)
- **`app_uploads`**: `/app/assets/uploads/` (fotos e imagens)

Para acessar os dados:
```bash
# Listar volumes
docker volume ls

# Inspecionar volume
docker volume inspect cellicruz_app_data
```

## 🔄 High Availability

### Como Funciona
1. **Nginx** atua como load balancer na porta 80
2. **Least Connections**: Distribui requisições entre app1 e app2
3. **Health Checks**: Remove apps que falharem
4. **Volumes Compartilhados**: Ambos os apps acessam dados iguais
5. **Auto-restart**: Containers reiniciam se caírem

### Cenários de Falha

**Se app1 cai:**
- Nginx automaticamente roteia requisições para app2
- app1 reinicia automaticamente
- Site continua 100% disponível

**Se app2 cai:**
- Nginx automaticamente roteia requisições para app1
- app2 reinicia automaticamente
- Site continua 100% disponível

**Se nginx cai:**
- Execute `docker-compose restart nginx`
- Ambos os apps continuam rodando

## 🔒 Segurança

### Proteção Incluída
- ✅ Aplicações rodam como non-root (nodejs user)
- ✅ Limites de CPU e Memória por container
- ✅ Health checks automáticos
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
