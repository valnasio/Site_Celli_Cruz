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

if [ ! -f /etc/nginx/ssl/cert.pem ] || [ ! -f /etc/nginx/ssl/key.pem ]; then
  echo "Criando certificado self-signed temporário..."
  openssl req -x509 -nodes -days 1 -newkey rsa:2048 \
    -keyout /etc/nginx/ssl/key.pem \
    -out /etc/nginx/ssl/cert.pem \
    -subj "/CN=localhost"
fi

echo "Iniciando Nginx..."
nginx -g 'daemon off;' &
NGINX_PID=$!

sleep 5

echo "Tentando emitir certificado Let's Encrypt para: $DOMAIN"
if certbot certonly --webroot -w /var/www/certbot -d "$DOMAIN" -m "$CERTBOT_EMAIL" --agree-tos --no-eff-email --non-interactive; then
  if [ -f /etc/letsencrypt/live/$DOMAIN/fullchain.pem ] && [ -f /etc/letsencrypt/live/$DOMAIN/privkey.pem ]; then
    echo "Certificado emitido com sucesso. Atualizando arquivos de SSL..."
    cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem /etc/nginx/ssl/cert.pem
    cp /etc/letsencrypt/live/$DOMAIN/privkey.pem /etc/nginx/ssl/key.pem
    nginx -s reload
  else
    echo "Aviso: certificado emitido mas arquivos não encontrados em /etc/letsencrypt/live/$DOMAIN"
  fi
else
  echo "Aviso: falha ao emitir certificado Let's Encrypt. O Nginx continuará rodando com o certificado temporário."
fi

wait $NGINX_PID
