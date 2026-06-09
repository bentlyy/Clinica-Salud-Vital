# Clinic Backend - Database Backup Script
# Usage: .\scripts\backup.ps1 [output_dir]
# Requires: pg_dump (PostgreSQL client)
# S3 Upload: Set S3_BUCKET env var or pipe output manually

param(
  [Parameter(Mandatory = $false)]
  [string]$OutputDir = "./backups"
)

$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$DbUrl = $env:DATABASE_URL
$S3Bucket = $env:S3_BUCKET

if (-not $DbUrl) {
  Write-Error "DATABASE_URL environment variable not set"
  exit 1
}

# Ensure output directory exists
New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null

$BackupFile = Join-Path -Path $OutputDir -ChildPath "clinic_backup_$Timestamp.sql"
$CompressedFile = "$BackupFile.gz"

Write-Host "[Backup] Starting database backup..."
Write-Host "[Backup] Output: $CompressedFile"

# Extract connection details from DATABASE_URL
# Format: postgresql://user:password@host:port/database
if ($DbUrl -match 'postgresql://([^:]+):([^@]+)@([^:]+):(\d+)/(.+)') {
  $User = $matches[1]
  $Password = $matches[2]
  $Hostname = $matches[3]
  $Port = $matches[4]
  $Database = $matches[5]

  $env:PGPASSWORD = $Password

  $StartTime = Get-Date
  & pg_dump -h $Hostname -p $Port -U $User -d $Database -F c -b -v -f $BackupFile 2>&1
  $ExitCode = $LASTEXITCODE

  Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue

  if ($ExitCode -ne 0) {
    Write-Error "[Backup] pg_dump failed with exit code $ExitCode"
    exit $ExitCode
  }

  $Duration = (Get-Date) - $StartTime
  Write-Host "[Backup] Dump completed in $($Duration.TotalSeconds)s"

  # Compress
  & gzip -f $BackupFile
  Write-Host "[Backup] Compressed: $CompressedFile"

  # File size
  $FileInfo = Get-Item $CompressedFile
  $SizeMB = [math]::Round($FileInfo.Length / 1MB, 2)
  Write-Host "[Backup] Size: ${SizeMB}MB"

  # Upload to S3 if configured
  if ($S3Bucket) {
    Write-Host "[Backup] Uploading to S3 bucket: $S3Bucket"
    $S3Key = "backups/clinic_backup_$Timestamp.sql.gz"

    try {
      if (Get-Command aws -ErrorAction SilentlyContinue) {
        & aws s3 cp $CompressedFile "s3://$S3Bucket/$S3Key" --storage-class STANDARD_IA
        Write-Host "[Backup] Uploaded to s3://$S3Bucket/$S3Key"
      } else {
        Write-Warning "[Backup] AWS CLI not found. Install aws-cli to enable S3 upload."
      }
    } catch {
      Write-Warning "[Backup] S3 upload failed: $_"
    }
  }

  # Retention: keep last 30 backups
  $MaxBackups = 30
  $Backups = Get-ChildItem -Path $OutputDir -Filter "clinic_backup_*.sql.gz" | Sort-Object LastWriteTime -Descending
  if ($Backups.Count -gt $MaxBackups) {
    $ToDelete = $Backups | Select-Object -Skip $MaxBackups
    foreach ($Old in $ToDelete) {
      Remove-Item -Path $Old.FullName -Force
      Write-Host "[Backup] Cleaned up old backup: $($Old.Name)"
    }
  }

  Write-Host "[Backup] Complete!"
} else {
  Write-Error "[Backup] Could not parse DATABASE_URL"
  exit 1
}
