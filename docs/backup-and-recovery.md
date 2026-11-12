# Backup and Disaster Recovery Runbook

## FBISE Educational Website (Federal Board Class 9 & Class 10)

This document provides complete operational procedures for creating, verifying, scheduling, and restoring full backups of the FBISE educational platform.

---

## 1. Architecture & Data Components

The system state is comprised of two core persistent components:

1. **Relational Database (PostgreSQL 16 Alpine)**
   - Stored in Docker volume: `fbise_postgres_data`
   - Contains:
     - User accounts (`User`), authentication credentials, and student profiles (`StudentProfile`)
     - Class levels (`ClassLevel`), Subjects (`Subject`), ClassSubjects (`ClassSubject`), and Chapters (`Chapter`)
     - Resources metadata (`Resource`)
     - Orders (`Order`), payment transaction logs, verification audit records (`verified_by`, `verified_at`, `rejection_reason`)
     - Student purchase download grants (`Purchase`)
     - Practice topics (`PracticeTopic`), question bank (`Question`, `QuestionOption`, `QuestionAcceptedAnswer`), practice sessions, and attempts
     - Static CMS page contents (`SitePageContent` for About, Contact, etc.)

2. **Media Storage (Uploaded PDF Documents)**
   - Stored in Docker volume: `fbise_media_data` (mounted at `/app/media` in the backend container)
   - Contains all uploaded PDF guides, notes, past papers, and solved exercises.

---

## 2. Backup Execution

Two native scripts are provided in the `/scripts` directory:
- `scripts/backup.sh` (Linux / macOS / WSL / Docker / CI)
- `scripts/backup.ps1` (Windows PowerShell)

### 2.1 Running on Linux / Docker Host

```bash
chmod +x scripts/backup.sh
./scripts/backup.sh
```

### 2.2 Running on Windows Host (PowerShell)

```powershell
powershell -ExecutionPolicy Bypass -File "scripts/backup.ps1"
```

### 2.3 What the Backup Generates

Each backup run creates a unique timestamped directory under `backups/backup_YYYYMMDD_HHMMSS/`:
```
backups/backup_20261108_171752/
├── db_backup.sql          # Full PostgreSQL dump with --clean --if-exists
├── media_backup.tar.gz    # Compressed archive of /app/media
├── checksums.sha256       # SHA256 cryptographic hashes for db and media
└── manifest.json          # Metadata with timestamp, byte sizes, and status
```

---

## 3. Cryptographic Verification

Integrity verification ensures backups have not suffered bitrot, network corruption, or unauthorized tampering.

### Linux / macOS:
```bash
cd backups/backup_YYYYMMDD_HHMMSS
sha256sum -c checksums.sha256
```

### Windows PowerShell:
```powershell
$BackupDir = "backups\backup_20261108_171752"
Get-FileHash "$BackupDir\db_backup.sql" -Algorithm SHA256
Get-FileHash "$BackupDir\media_backup.tar.gz" -Algorithm SHA256
Get-Content "$BackupDir\checksums.sha256"
```

---

## 4. Disaster Recovery & Restoration

Restoration scripts automatically verify the cryptographic checksums before applying any database changes.

### 4.1 Running on Linux / Docker Host

```bash
chmod +x scripts/restore.sh
# To restore latest backup automatically:
./scripts/restore.sh

# Or to restore a specific backup archive:
./scripts/restore.sh backups/backup_20261108_171752
```

### 4.2 Running on Windows Host (PowerShell)

```powershell
# Restore latest backup automatically:
powershell -ExecutionPolicy Bypass -File "scripts/restore.ps1"

# Or restore a specific backup archive:
powershell -ExecutionPolicy Bypass -File "scripts/restore.ps1" -BackupPath "backups\backup_20261108_171752"
```

### 4.3 Post-Restoration Validation

After running the restore script, verify application health:
```bash
# Verify backend system checks
docker compose exec -T backend python manage.py check

# Check health endpoint
curl -I http://localhost:8000/api/health/
```

Expected HTTP response: `200 OK` with JSON `{"status": "healthy", "database": "connected"}`.

---

## 5. Automated Backup Scheduling

### 5.1 Linux Cron Job (Daily at 02:00 AM)

Add to system crontab (`crontab -e`):
```cron
0 2 * * * cd /var/www/educational-website && ./scripts/backup.sh >> /var/log/fbise_backup.log 2>&1
```

### 5.2 Windows Task Scheduler (Daily at 02:00 AM)

Run in administrative PowerShell:
```powershell
$Action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-ExecutionPolicy Bypass -File `"C:\Users\Sherry Mughal\Desktop\Educational Website\scripts\backup.ps1`""
$Trigger = New-ScheduledTaskTrigger -Daily -At 2:00AM
Register-ScheduledTask -Action $Action -Trigger $Trigger -TaskName "FBISE_Daily_Backup" -Description "Daily automated backup of FBISE database and PDFs"
```

---

## 6. Retention Policy

To manage disk space on production servers, maintain:
- Daily backups: Retain for 14 days
- Weekly backups: Retain for 8 weeks
- Monthly backups: Retain for 12 months

Pruning backups older than 30 days on Linux:
```bash
find backups/ -type d -name "backup_*" -mtime +30 -exec rm -rf {} +
```

