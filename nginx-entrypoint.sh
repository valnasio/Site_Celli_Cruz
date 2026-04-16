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

# Criar certificado temporário para iniciar
if [ ! -f /etc/nginx/ssl/cert.pem ] || [ ! -f /etc/nginx/ssl/key.pem ]; then
  echo "Criando certificado temporário para inicialização..."
  openssl req -x509 -nodes -days 1 -newkey rsa:2048 \
    -keyout /etc/nginx/ssl/key.pem \
    -out /etc/nginx/ssl/cert.pem \
    -subj "/CN=localhost"
fi

echo "Iniciando Nginx com certificado temporário..."
nginx -g 'daemon off;' &
NGINX_PID=$!

sleep 5

# Função para tentar obter certificado
try_get_cert() {
  echo "Tentando obter certificado Let's Encrypt para: $DOMAIN"
  
  if certbot certonly --webroot -w /var/www/certbot -d "$DOMAIN" -m "$CERTBOT_EMAIL" --agree-tos --no-eff-email --non-interactive; then
    if [ -f /etc/letsencrypt/live/$DOMAIN/fullchain.pem ] && [ -f /etc/letsencrypt/live/$DOMAIN/privkey.pem ]; then
      echo "Certificado obtido com sucesso! Atualizando SSL..."
      cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem /etc/nginx/ssl/cert.pem
      cp /etc/letsencrypt/live/$DOMAIN/privkey.pem /etc/nginx/ssl/key.pem
      nginx -s reload
      echo "Nginx recarregado com certificado válido."
      return 0
    fi
  fi
  return 1
}

# Tentar obter certificado na inicialização
if try_get_cert; then
  echo "Certificado válido obtido na inicialização."
else
  echo "Não foi possível obter certificado na inicialização. Continuando com temporário."
  echo "Tentativas automáticas continuarão em background."
fi

# Processo de obtenção/renovação automática em background
(
  while true; do
    sleep 3600  # Verificar a cada hora
    
    if [ -f /etc/letsencrypt/live/$DOMAIN/fullchain.pem ]; then
      # Já tem certificado, tentar renovar
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
    else
      # Ainda não tem certificado, tentar obter
      if try_get_cert; then
        echo "Certificado obtido com sucesso em tentativa automática!"
      fi
    fi
  done
) &

wait $NGINX_PID
