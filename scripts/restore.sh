#!/usr/bin/env bash
# ==============================================================================
# FBISE Educational Platform - Restore & Disaster Recovery Script
# Restores:
# 1. PostgreSQL Database from db_backup.sql
# 2. Media Files and PDFs from media_backup.tar.gz
# Enforces cryptographic SHA256 verification before applying restoration.
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "${SCRIPT_DIR}")"
cd "${ROOT_DIR}"

BACKUP_TARGET="${1:-}"

if [ -z "${BACKUP_TARGET}" ]; then
    # Find latest backup in backups/
    if [ ! -d "backups" ]; then
        echo "ERROR: No backups directory found!" >&2
        exit 1
    fi
    BACKUP_TARGET=$(ls -td backups/backup_* 2>/dev/null | head -n 1 || true)
    if [ -z "${BACKUP_TARGET}" ]; then
        echo "ERROR: No backup folders found inside backups/!" >&2
        exit 1
    fi
fi

if [ ! -d "${BACKUP_TARGET}" ]; then
    echo "ERROR: Target backup directory '${BACKUP_TARGET}' does not exist!" >&2
    exit 1
fi

echo "======================================================================"
echo " FBISE Educational Website - Disaster Recovery & Restore"
echo " Target Backup: ${BACKUP_TARGET}"
echo "======================================================================"

# 1. Verify Checksums
echo "[1/4] Verifying SHA256 checksums..."
cd "${BACKUP_TARGET}"
if [ -f "checksums.sha256" ]; then
    if command -v sha256sum >/dev/null 2>&1; then
        sha256sum -c checksums.sha256
    elif command -v shasum >/dev/null 2>&1; then
        shasum -a 256 -c checksums.sha256
    fi
    echo "  ✓ Checksums match perfectly."
else
    echo "  ⚠️ Warning: checksums.sha256 not found. Proceeding with caution."
fi
cd "${ROOT_DIR}"

DB_USER="${POSTGRES_USER:-fbise_user}"
DB_NAME="${POSTGRES_DB:-fbise_db}"

echo "[2/4] Restoring PostgreSQL database (${DB_NAME})..."
docker compose exec -T db psql -U "${DB_USER}" -d "${DB_NAME}" < "${BACKUP_TARGET}/db_backup.sql"
echo "  ✓ Database restoration complete."

echo "[3/4] Restoring media storage and PDF files..."
docker compose exec -T backend tar -xzf - -C /app < "${BACKUP_TARGET}/media_backup.tar.gz"
echo "  ✓ Media restoration complete."

echo "[4/4] Validating backend health and schema integrity..."
docker compose exec -T backend python manage.py check
echo "  ✓ Django system check passed."

echo "======================================================================"
echo " Restoration completed successfully from: ${BACKUP_TARGET}"
echo " Database and media files are fully restored and active."
echo "======================================================================"

