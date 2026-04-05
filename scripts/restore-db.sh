#!/bin/bash
# Restore PostgreSQL - NormX
# Usage: ./scripts/restore-db.sh <backup_file.sql.gz>

set -euo pipefail

BACKUP_FILE="${1:?Usage: $0 <backup_file.sql.gz>}"

if [ ! -f "$BACKUP_FILE" ]; then
  echo "Erreur: fichier $BACKUP_FILE introuvable."
  exit 1
fi

echo "[$(date)] Restoration depuis: $BACKUP_FILE"
echo "ATTENTION: Cela va ecraser la base de donnees actuelle!"
read -p "Continuer ? (oui/non) " confirm
if [ "$confirm" != "oui" ]; then
  echo "Annule."
  exit 0
fi

if command -v docker &> /dev/null && docker ps --format '{{.Names}}' | grep -q 'normx-postgres'; then
  CONTAINER="normx-postgres"
  echo "[$(date)] Restore via Docker container: $CONTAINER"
  gunzip -c "$BACKUP_FILE" | docker exec -i "$CONTAINER" psql -U "${POSTGRES_USER:-normx}" -d "${POSTGRES_DB:-normx}"
else
  echo "[$(date)] Restore local psql"
  PGPASSWORD="${DB_PASSWORD:-}" gunzip -c "$BACKUP_FILE" | psql -h "${DB_HOST:-localhost}" -p "${DB_PORT:-5432}" -U "${DB_USER:-normx}" -d "${DB_NAME:-normx}"
fi

echo "[$(date)] Restoration terminee avec succes."
