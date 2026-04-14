# Troubleshooting - Docker em VPS Ubuntu

Guia para resolver problemas de acesso ao aplicativo em VPS.

## 1️⃣ Verificar se Docker Compose está rodando

```bash
docker compose ps
```

Esperado:
```
SERVICE         STATUS
nginx           Up (healthy)
app1            Up (healthy)
app2            Up (healthy)
data_sync       Up
```

Se algum container não está "Up":
```bash
# Ver logs
docker compose logs

# Ver logs de um serviço específico
docker compose logs nginx
docker compose logs app1
```

---

## 2️⃣ Verificar Portas

### Nginx está escutando?

```bash
# Verificar porta 80
sudo netstat -tlnp | grep 80

# Ou com ss
sudo ss -tlnp | grep 80
```

Esperado:
```
tcp  LISTEN  docker-proxy  :::80
```

### Se não aparecer, verificar Docker:

```bash
# Ver port mapping do nginx
docker inspect celli_cruz_nginx | grep -A 10 "Ports"

# Teste acesso interno
docker exec celli_cruz_nginx curl -I http://localhost
```

---

## 3️⃣ Testar Acesso Localmente na VPS

```bash
# De dentro da VPS
curl http://localhost
curl http://127.0.0.1
```

Se funcionar localmente mas não externamente = firewall

---

## 4️⃣ Liberar Firewall (Ubuntu)

### UFW (Ubuntu Firewall)

```bash
# Ver status
sudo ufw status

# Permitir HTTP (porta 80)
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Recarregar
sudo ufw reload

# Verificar
sudo ufw status numbered
```

### Verificar iptables

```bash
# Ver regras
sudo iptables -L -n

# Se bloqueando:
sudo iptables -A INPUT -p tcp --dport 80 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 443 -j ACCEPT
```

---

## 5️⃣ Acessar por IP

### Descobrir IP da VPS

```bash
hostname -I
# ou
ip addr show
```

### Testar acesso externo

```bash
# De sua máquina local
curl http://<IP_DA_VPS>
# Exemplo:
curl http://192.168.1.100
```

---

## 6️⃣ Verificar Docker Networking

### Containers estão na rede correta?

```bash
# Ver redes
docker network ls

# Inspecionar rede
docker network inspect cellicruz_celli_network
```

### Testar comunicação entre containers

```bash
# App consegue alcançar nginx?
docker exec celli_cruz_app1 curl http://nginx

# Nginx consegue alcançar app?
docker exec celli_cruz_nginx curl http://app1:8000
```

---

## 7️⃣ Nginx não roteia requisições?

### Verificar configuração do nginx

```bash
# Ver arquivo de config dentro do container
docker exec celli_cruz_nginx cat /etc/nginx/nginx.conf

# Testar nginx
docker exec celli_cruz_nginx nginx -t
```

### Se der erro, verificar logs

```bash
docker compose logs nginx
```

---

## 8️⃣ Problemas Comuns

### "Connection refused"

**Checklist:**
- [ ] Docker compose com status "Up"?
- [ ] Porta 80 aberta no firewall?
- [ ] Nginx consegue alcançar apps?
- [ ] Rede Docker correta?

**Solução rápida:**
```bash
# Reiniciar tudo
docker compose down
docker compose up -d --remove-orphans

# Aguardar 30-60 segundos
sleep 60

# Verificar
curl http://localhost
```

### "Connection timed out"

= Firewall está bloqueando

**Solução:**
```bash
# Ubuntu UFW
sudo ufw allow 80/tcp

# Se AWS/Azure/GCP: Verificar security group
# Se VPS: Verificar painel de firewall
```

### Apps não resolvem hostname

**Causa:** Rede Docker não está funcionando

**Solução:**
```bash
# Ver rede
docker network inspect cellicruz_celli_network

# Desligar e recriar
docker compose down
docker network rm cellicruz_celli_network
docker compose up -d
```

---

## 9️⃣ Teste Passo a Passo

### Passo 1: Local na VPS
```bash
docker exec celli_cruz_nginx curl -I http://localhost
```
Deve retornar HTTP/1.1 200 OK

### Passo 2: IP interno
```bash
curl -I http://nginx
```
Deve conectar (se dentro do container)

### Passo 3: Localhost da VPS
```bash
curl -I http://localhost
```
Deve retornar 200 OK

### Passo 4: Externamente
```bash
# De seu PC
curl -I http://<IP_VPS>
```
Deve retornar 200 OK

---

## 🔟 Debug Completo

Se nada funcionar, execute tudo isso e compartilhe os outputs:

```bash
echo "=== Docker Status ==="
docker compose ps

echo "=== Containers Rodando ==="
docker ps

echo "=== Portas Abertas ==="
sudo netstat -tlnp | grep -E "80|443"

echo "=== Firewall Status ==="
sudo ufw status

echo "=== Network Docker ==="
docker network ls

echo "=== Teste Local ==="
curl -v http://localhost

echo "=== Logs Nginx ==="
docker compose logs nginx --tail 20

echo "=== IP Máquina ==="
hostname -I
```

---

## ✅ Resumo Rápido

| Problema | Solução |
|----------|---------|
| Containers não sobem | `docker compose logs` |
| Firewall bloqueia | `sudo ufw allow 80/tcp` |
| Nginx não roteia | Reiniciar: `docker compose restart nginx` |
| Rede broke | `docker compose down && docker compose up -d` |
| Acesso local ok, externo não | Firewall/Security Group |

---

Compartilhe o output dos comandos acima e consigo ajudar mais específico!
