#!/bin/sh
# Bootstrap inicial do Let's Encrypt para a stack de produção.
#
# Rodar UMA vez antes de subir o nginx em modo HTTPS:
#   DOMAIN=cafe.exemplo.com LETSENCRYPT_EMAIL=voce@exemplo.com \
#     ./nginx/init-letsencrypt.sh
#
# Passos:
#   1. Cria certificado "fake" (autoassinado) para o nginx subir.
#   2. Sobe nginx servindo /.well-known/acme-challenge na porta 80.
#   3. Pede o cert real via certbot (HTTP-01 via webroot).
#   4. Recarrega o nginx para passar a servir o cert real.

set -eu

: "${DOMAIN:?defina DOMAIN=seu-dominio.com}"
: "${LETSENCRYPT_EMAIL:?defina LETSENCRYPT_EMAIL=voce@exemplo.com}"

COMPOSE="docker compose -f docker-compose.prod.yml"

echo "==> Criando volumes/diretórios do certbot"
$COMPOSE run --rm --entrypoint "\
  sh -c 'mkdir -p /etc/letsencrypt/live/${DOMAIN} && \
         openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
           -keyout /etc/letsencrypt/live/${DOMAIN}/privkey.pem \
           -out /etc/letsencrypt/live/${DOMAIN}/fullchain.pem \
           -subj /CN=localhost'" certbot

echo "==> Subindo nginx com cert temporário"
$COMPOSE up -d nginx

echo "==> Apagando cert temporário"
$COMPOSE run --rm --entrypoint "\
  sh -c 'rm -rf /etc/letsencrypt/live/${DOMAIN} \
                /etc/letsencrypt/archive/${DOMAIN} \
                /etc/letsencrypt/renewal/${DOMAIN}.conf'" certbot

echo "==> Pedindo certificado real para ${DOMAIN}"
$COMPOSE run --rm --entrypoint "\
  certbot certonly --webroot -w /var/www/certbot \
    --email ${LETSENCRYPT_EMAIL} \
    -d ${DOMAIN} \
    --rsa-key-size 2048 \
    --agree-tos \
    --no-eff-email \
    --force-renewal" certbot

echo "==> Recarregando nginx"
$COMPOSE exec nginx nginx -s reload

echo "==> Pronto. Certificado emitido para ${DOMAIN}."
