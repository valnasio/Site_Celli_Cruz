#!/usr/bin/env sh
set -e
cd "$(dirname "$0")"

if [ ! -f .env ]; then
  echo ".env não encontrado. Crie o arquivo .env na raiz do projeto com DOMAIN e CERTBOT_EMAIL."
  exit 1
fi

DOMAIN=$(grep -E '^DOMAIN=' .env | cut -d'=' -f2-)
CERTBOT_EMAIL=$(grep -E '^CERTBOT_EMAIL=' .env | cut -d'=' -f2-)

if [ -z "$DOMAIN" ]; then
  echo 'DOMAIN não definido em .env'
  exit 1
fi
if [ -z "$CERTBOT_EMAIL" ]; then
  echo 'CERTBOT_EMAIL não definido em .env'
  exit 1
fi

echo "Usando domínio: $DOMAIN"
echo "Usando e-mail: $CERTBOT_EMAIL"

mkdir -p ssl letsencrypt webroot

if [ ! -f ssl/cert.pem ] || [ ! -f ssl/key.pem ]; then
  echo 'Gerando certificado temporário self-signed para permitir inicialização do nginx...'
  docker run --rm -v "$(pwd)/ssl:/ssl" alpine sh -c "apk add --no-cache openssl >/dev/null 2>&1 && openssl req -x509 -nodes -days 1 -newkey rsa:2048 -keyout /ssl/key.pem -out /ssl/cert.pem -subj '/CN=localhost'"
fi

echo 'Iniciando nginx...'
docker compose up -d nginx

echo 'Solicitando certificado com Certbot...'
docker compose run --rm certbot certonly --webroot -w /var/www/certbot -d "$DOMAIN" -m "$CERTBOT_EMAIL" --agree-tos --no-eff-email

echo 'Copiando certificado para ssl/cert.pem e ssl/key.pem...'
docker compose run --rm certbot sh -c "cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem /etc/nginx/ssl/cert.pem && cp /etc/letsencrypt/live/$DOMAIN/privkey.pem /etc/nginx/ssl/key.pem"

echo 'Reiniciando nginx com SSL habilitado...'
docker compose restart nginx

echo 'SSL instalado com sucesso para o domínio:' $DOMAIN
