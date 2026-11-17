#!/usr/bin/env bash
# Backup diário do Postgres de produção.
#
# Uso (na VPS, a partir da raiz do projeto):
#   ./scripts/backup-db.sh
#
# Variáveis opcionais:
#   BACKUP_RETENTION_DAYS  dias de retenção dentro do volume (padrão: 14)
#   BACKUP_COPY_DIR        pasta no host para onde copiar o dump (ex.: montagem
#                          de outro disco, rclone mount). Vazio = não copia.
set -euo pipefail

cd "$(dirname "$0")/.."

ENV_FILE=".env.production"
CONTAINER="cafe-postgres-prod"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "[backup] $ENV_FILE não encontrado em $(pwd)" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
. "./$ENV_FILE"
set +a

: "${POSTGRES_USER:?POSTGRES_USER ausente no $ENV_FILE}"
: "${POSTGRES_DB:?POSTGRES_DB ausente no $ENV_FILE}"

FILE="cafe-$(date +%F-%H%M).dump"

docker exec "$CONTAINER" sh -c \
  "pg_dump -U '$POSTGRES_USER' -d '$POSTGRES_DB' -Fc -f '/backups/$FILE' \
   && find /backups -name 'cafe-*.dump' -mtime +$RETENTION_DAYS -delete"

# pg_restore --list falha se o dump estiver truncado ou corrompido.
docker exec "$CONTAINER" pg_restore --list "/backups/$FILE" > /dev/null

if [[ -n "${BACKUP_COPY_DIR:-}" ]]; then
  mkdir -p "$BACKUP_COPY_DIR"
  docker cp "$CONTAINER:/backups/$FILE" "$BACKUP_COPY_DIR/$FILE"
  find "$BACKUP_COPY_DIR" -name 'cafe-*.dump' -mtime +"$RETENTION_DAYS" -delete
fi

echo "[backup] ok: $FILE"
