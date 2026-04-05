#!/bin/bash
# Backup PostgreSQL - NormX
# Usage: ./scripts/backup-db.sh [backup_dir]

set -euo pipefail

BACKUP_DIR="${1:-/opt/backups/normx}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/normx_${TIMESTAMP}.sql.gz"
RETENTION_DAYS=30

# Creer le repertoire si necessaire
mkdir -p "$BACKUP_DIR"

# Detecter si on est dans Docker ou en local
if command -v docker &> /dev/null && docker ps --format '{{.Names}}' | grep -q 'normx-postgres'; then
  CONTAINER="normx-postgres"
  echo "[$(date)] Backup via Docker container: $CONTAINER"
  docker exec "$CONTAINER" pg_dump -U "${POSTGRES_USER:-normx}" -d "${POSTGRES_DB:-normx}" --no-owner --no-acl | gzip > "$BACKUP_FILE"
else
  echo "[$(date)] Backup local pg_dump"
  PGPASSWORD="${DB_PASSWORD:-}" pg_dump -h "${DB_HOST:-localhost}" -p "${DB_PORT:-5432}" -U "${DB_USER:-normx}" -d "${DB_NAME:-normx}" --no-owner --no-acl | gzip > "$BACKUP_FILE"
fi

# Verifier taille
SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "[$(date)] Backup cree: $BACKUP_FILE ($SIZE)"

# Rotation : supprimer les backups de plus de RETENTION_DAYS jours
find "$BACKUP_DIR" -name "normx_*.sql.gz" -mtime +${RETENTION_DAYS} -delete
REMAINING=$(ls -1 "$BACKUP_DIR"/normx_*.sql.gz 2>/dev/null | wc -l)
echo "[$(date)] Rotation: $REMAINING backups conserves (retention ${RETENTION_DAYS}j)"

echo "[$(date)] Backup termine avec succes."
