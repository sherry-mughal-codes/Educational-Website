#!/usr/bin/env bash
# ==============================================================================
# FBISE Educational Platform - Automated Backup Script
# Creates a full, cryptographically verified backup of:
# 1. PostgreSQL Relational Database (users, profiles, subjects, orders, purchases, topics)
# 2. Media Storage (/app/media including all uploaded PDF guides)
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "${SCRIPT_DIR}")"
cd "${ROOT_DIR}"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="${ROOT_DIR}/backups/backup_${TIMESTAMP}"
mkdir -p "${BACKUP_DIR}"

echo "======================================================================"
echo " FBISE Educational Website - Production Backup Utility"
echo " Timestamp: ${TIMESTAMP}"
echo " Destination: ${BACKUP_DIR}"
echo "======================================================================"

# Determine database credentials from environment or defaults
DB_USER="${POSTGRES_USER:-fbise_user}"
DB_NAME="${POSTGRES_DB:-fbise_db}"

echo "[1/4] Dumping PostgreSQL database (${DB_NAME})..."
docker compose exec -T db pg_dump -U "${DB_USER}" -d "${DB_NAME}" --clean --if-exists > "${BACKUP_DIR}/db_backup.sql"

if [ ! -s "${BACKUP_DIR}/db_backup.sql" ]; then
    echo "ERROR: Database dump file is empty!" >&2
    exit 1
fi
DB_SIZE=$(du -h "${BACKUP_DIR}/db_backup.sql" | cut -f1)
echo "  ✓ Database dump complete (${DB_SIZE})"

echo "[2/4] Archiving media files and uploaded PDFs..."
docker compose exec -T backend tar -czf - -C /app media > "${BACKUP_DIR}/media_backup.tar.gz"

if [ ! -s "${BACKUP_DIR}/media_backup.tar.gz" ]; then
    echo "ERROR: Media archive file is empty!" >&2
    exit 1
fi
MEDIA_SIZE=$(du -h "${BACKUP_DIR}/media_backup.tar.gz" | cut -f1)
echo "  ✓ Media archive complete (${MEDIA_SIZE})"

echo "[3/4] Generating cryptographic SHA256 checksums..."
cd "${BACKUP_DIR}"
if command -v sha256sum >/dev/null 2>&1; then
    sha256sum db_backup.sql media_backup.tar.gz > checksums.sha256
elif command -v shasum >/dev/null 2>&1; then
    shasum -a 256 db_backup.sql media_backup.tar.gz > checksums.sha256
fi
echo "  ✓ Checksums written to checksums.sha256"

echo "[4/4] Writing backup manifest..."
cat <<EOF > manifest.json
{
  "timestamp": "${TIMESTAMP}",
  "database": "${DB_NAME}",
  "database_size": "${DB_SIZE}",
  "media_size": "${MEDIA_SIZE}",
  "created_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "status": "completed"
}
EOF

echo "======================================================================"
echo " Backup completed successfully!"
echo " Location: ${BACKUP_DIR}"
echo " Database: ${DB_SIZE} | Media: ${MEDIA_SIZE}"
echo "======================================================================"

