#!/bin/sh
set -e

if [ -z "$DOMAIN" ]; then
  echo "ERROR: DOMAIN não definido. Defina o DOMAIN em .env."
  exit 1
fi
if [ -z "$CERTBOT_EMAIL" ]; then
  echo "ERROR: CERTBOT_EMAIL não definido. Defina o CERTBOT_EMAIL em .env."
  exit 1
fi

mkdir -p /var/www/certbot /etc/nginx/ssl /etc/letsencrypt

# Aguardar certificado válido antes de iniciar Nginx
echo "Aguardando certificado SSL válido para $DOMAIN..."

CERT_OBTAINED=false

# Tentar até obter certificado válido
for attempt in 1 2 3 4 5; do
  echo "Tentativa $attempt de 5 para obter certificado Let's Encrypt..."
  
  if certbot certonly --webroot -w /var/www/certbot -d "$DOMAIN" -m "$CERTBOT_EMAIL" --agree-tos --no-eff-email --non-interactive; then
    if [ -f /etc/letsencrypt/live/$DOMAIN/fullchain.pem ] && [ -f /etc/letsencrypt/live/$DOMAIN/privkey.pem ]; then
      echo "Certificado obtido com sucesso na tentativa $attempt!"
      cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem /etc/nginx/ssl/cert.pem
      cp /etc/letsencrypt/live/$DOMAIN/privkey.pem /etc/nginx/ssl/key.pem
      CERT_OBTAINED=true
      break
    fi
  fi
  
  if [ $attempt -lt 5 ]; then
    sleep_time=$((attempt * 30))
    echo "Tentativa $attempt falhou. Aguardando ${sleep_time}s antes de tentar novamente..."
    sleep $sleep_time
  fi
done

if [ "$CERT_OBTAINED" = false ]; then
  echo "ERRO: Não foi possível obter certificado Let's Encrypt após 5 tentativas."
  echo "Verifique:"
  echo "  - Se o domínio $DOMAIN aponta para este servidor"
  echo "  - Se as portas 80 e 443 estão abertas no firewall"
  echo "  - Se o DNS propagou (pode levar até 24h)"
  exit 1
fi

echo "Certificado SSL válido obtido. Iniciando Nginx..."

# Iniciar Nginx
nginx -g 'daemon off;' &
NGINX_PID=$!

# Processo de renovação automática em background
(
  while true; do
    sleep 86400  # Verificar a cada 24 horas
    echo "Verificando renovação de certificado..."
    
    if certbot renew --quiet; then
      if [ -f /etc/letsencrypt/live/$DOMAIN/fullchain.pem ]; then
        echo "Certificado renovado. Atualizando arquivos SSL..."
        cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem /etc/nginx/ssl/cert.pem
        cp /etc/letsencrypt/live/$DOMAIN/privkey.pem /etc/nginx/ssl/key.pem
        nginx -s reload
        echo "Certificado atualizado com sucesso."
      fi
    fi
  done
) &

wait $NGINX_PID
