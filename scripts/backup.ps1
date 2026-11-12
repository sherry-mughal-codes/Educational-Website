# ==============================================================================
# FBISE Educational Platform - Automated Backup Script (Windows PowerShell)
# Creates a full, cryptographically verified backup of:
# 1. PostgreSQL Relational Database (users, profiles, subjects, orders, purchases, topics)
# 2. Media Storage (/app/media including all uploaded PDF guides)
# ==============================================================================

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Split-Path -Parent $ScriptDir
Set-Location $RootDir

$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$BackupDir = Join-Path $RootDir "backups\backup_$Timestamp"

if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
}

Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host " FBISE Educational Website - Production Backup Utility" -ForegroundColor Cyan
Write-Host " Timestamp: $Timestamp"
Write-Host " Destination: $BackupDir"
Write-Host "======================================================================"

$DbUser = if ($env:POSTGRES_USER) { $env:POSTGRES_USER } else { "fbise_user" }
$DbName = if ($env:POSTGRES_DB) { $env:POSTGRES_DB } else { "fbise_db" }

Write-Host "[1/4] Dumping PostgreSQL database ($DbName)..." -ForegroundColor Yellow
$DbDumpPath = Join-Path $BackupDir "db_backup.sql"
cmd /c "docker compose exec -T db pg_dump -U $DbUser -d $DbName --clean --if-exists > `"$DbDumpPath`""

$DbItem = Get-Item $DbDumpPath
if ($DbItem.Length -eq 0) {
    Write-Error "ERROR: Database dump file is empty!"
}
$DbSizeKb = [math]::Round($DbItem.Length / 1024, 2)
Write-Host "  Database dump complete ($DbSizeKb KB)" -ForegroundColor Green

Write-Host "[2/4] Archiving media files and uploaded PDFs..." -ForegroundColor Yellow
$MediaArchivePath = Join-Path $BackupDir "media_backup.tar.gz"

cmd /c "docker compose exec -T backend tar -czf - -C /app media > `"$MediaArchivePath`""

$MediaItem = Get-Item $MediaArchivePath
if ($MediaItem.Length -eq 0) {
    Write-Error "ERROR: Media archive file is empty!"
}
$MediaSizeKb = [math]::Round($MediaItem.Length / 1024, 2)
Write-Host "  Media archive complete ($MediaSizeKb KB)" -ForegroundColor Green

Write-Host "[3/4] Generating cryptographic SHA256 checksums..." -ForegroundColor Yellow
$DbHash = (Get-FileHash -Path $DbDumpPath -Algorithm SHA256).Hash.ToLower()
$MediaHash = (Get-FileHash -Path $MediaArchivePath -Algorithm SHA256).Hash.ToLower()

$ChecksumContent = "$DbHash  db_backup.sql`r`n$MediaHash  media_backup.tar.gz`r`n"
$ChecksumPath = Join-Path $BackupDir "checksums.sha256"
[System.IO.File]::WriteAllText($ChecksumPath, $ChecksumContent)
Write-Host "  SHA256 Checksums written to checksums.sha256" -ForegroundColor Green

Write-Host "[4/4] Writing backup manifest..." -ForegroundColor Yellow
$Manifest = [ordered]@{
    timestamp = $Timestamp
    database = $DbName
    database_size_bytes = $DbItem.Length
    media_size_bytes = $MediaItem.Length
    db_sha256 = $DbHash
    media_sha256 = $MediaHash
    created_at = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')
    status = "completed"
}
$ManifestJson = $Manifest | ConvertTo-Json -Depth 4
$ManifestPath = Join-Path $BackupDir "manifest.json"
[System.IO.File]::WriteAllText($ManifestPath, $ManifestJson)

Write-Host "======================================================================" -ForegroundColor Green
Write-Host " Backup completed successfully!" -ForegroundColor Green
Write-Host " Location: $BackupDir"
Write-Host " Database: $DbSizeKb KB | Media: $MediaSizeKb KB"
Write-Host "======================================================================"
