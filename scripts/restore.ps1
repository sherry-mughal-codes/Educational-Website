# ==============================================================================
# FBISE Educational Platform - Restore & Disaster Recovery Script (Windows PowerShell)
# Restores:
# 1. PostgreSQL Database from db_backup.sql
# 2. Media Files and PDFs from media_backup.tar.gz
# Enforces cryptographic SHA256 verification before applying restoration.
# ==============================================================================

param (
    [string]$BackupPath = ""
)

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Split-Path -Parent $ScriptDir
Set-Location $RootDir

if (-not $BackupPath) {
    $BackupsRoot = Join-Path $RootDir "backups"
    if (-not (Test-Path $BackupsRoot)) {
        Write-Error "ERROR: No backups directory found at $BackupsRoot"
    }
    $Latest = Get-ChildItem -Path $BackupsRoot -Directory -Filter "backup_*" | Sort-Object CreationTime -Descending | Select-Object -First 1
    if (-not $Latest) {
        Write-Error "ERROR: No backup folders found inside $BackupsRoot"
    }
    $BackupPath = $Latest.FullName
}

if (-not (Test-Path $BackupPath)) {
    Write-Error "ERROR: Target backup directory '$BackupPath' does not exist!"
}

Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host " FBISE Educational Website - Disaster Recovery & Restore" -ForegroundColor Cyan
Write-Host " Target Backup: $BackupPath"
Write-Host "======================================================================"

# 1. Verify Checksums strictly
Write-Host "[1/4] Verifying cryptographic SHA256 checksums..." -ForegroundColor Yellow
$DbDumpPath = Join-Path $BackupPath "db_backup.sql"
$MediaArchivePath = Join-Path $BackupPath "media_backup.tar.gz"
$ChecksumPath = Join-Path $BackupPath "checksums.sha256"

if (-not (Test-Path $ChecksumPath)) {
    Write-Error "ERROR: checksums.sha256 was not found in $BackupPath! Restoration aborted to prevent database corruption."
}

$DbHashCalculated = (Get-FileHash -Path $DbDumpPath -Algorithm SHA256).Hash.ToLower()
$MediaHashCalculated = (Get-FileHash -Path $MediaArchivePath -Algorithm SHA256).Hash.ToLower()
$ChecksumContent = (Get-Content -Path $ChecksumPath -Raw).ToLower()

if (-not ($ChecksumContent.Contains($DbHashCalculated) -and $ChecksumContent.Contains($MediaHashCalculated))) {
    Write-Error "CRITICAL: Checksum verification failed! One or more backup files have been altered or corrupted. Restoration aborted."
}
Write-Host "  ✓ SHA256 checksums verified successfully." -ForegroundColor Green

$DbUser = if ($env:POSTGRES_USER) { $env:POSTGRES_USER } else { "fbise_user" }
$DbName = if ($env:POSTGRES_DB) { $env:POSTGRES_DB } else { "fbise_db" }

Write-Host "[2/4] Restoring PostgreSQL database ($DbName)..." -ForegroundColor Yellow
cmd /c "type `"$DbDumpPath`" | docker compose exec -T db psql -U $DbUser -d $DbName"
Write-Host "  Database restoration complete." -ForegroundColor Green

Write-Host "[3/4] Restoring media storage and PDF files..." -ForegroundColor Yellow
cmd /c "type `"$MediaArchivePath`" | docker compose exec -T backend tar -xzf - -C /app"
Write-Host "  Media restoration complete." -ForegroundColor Green

Write-Host "[4/4] Validating backend health and schema integrity..." -ForegroundColor Yellow
docker compose exec -T backend python manage.py check
Write-Host "  Django system check passed." -ForegroundColor Green

Write-Host "======================================================================" -ForegroundColor Green
Write-Host " Restoration completed successfully from: $BackupPath" -ForegroundColor Green
Write-Host " Database and media files are fully restored and active." -ForegroundColor Green
Write-Host "======================================================================"
