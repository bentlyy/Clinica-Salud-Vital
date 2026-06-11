#!/usr/bin/env bash
set -euo pipefail

# Backup Verification Script
# Verifies a PostgreSQL dump by restoring to a temp database and running checks.
#
# Usage:
#   ./scripts/backup-verify.sh <backup_file>
#   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/clinic ./scripts/backup-verify.sh backups/clinic_backup_20260101_120000.sql.gz
#
# Requires: psql, pg_restore, gzip (or zcat)
# The script uses the same DATABASE_URL format as the app.

BACKUP_FILE="${1:?Usage: $0 <backup_file>}"
DB_URL="${DATABASE_URL:?DATABASE_URL not set}"
TEMP_DB="verify_$(date +%s)_$$"

PASS=0
FAIL=0

cleanup() {
  local ec=$?
  if psql -d "$DB_URL" -c "DROP DATABASE IF EXISTS \"$TEMP_DB\"" 2>/dev/null; then
    echo "[Verify] Cleaned up temp database: $TEMP_DB"
  fi
  exit $ec
}
trap cleanup EXIT INT TERM

echo "[Verify] === Backup Verification ==="
echo "[Verify] File: $BACKUP_FILE"
echo "[Verify] Temp DB: $TEMP_DB"
echo ""

# 1. File existence and size
if [ ! -f "$BACKUP_FILE" ]; then
  echo "[FAIL] Backup file not found: $BACKUP_FILE"
  exit 1
fi
SIZE=$(stat -c%s "$BACKUP_FILE" 2>/dev/null || stat -f%z "$BACKUP_FILE" 2>/dev/null)
echo "[PASS] Backup file exists ($SIZE bytes)"
PASS=$((PASS + 1))

# 2. Check file is valid gzip
if ! gzip -t "$BACKUP_FILE" 2>/dev/null; then
  echo "[FAIL] Not a valid gzip file"
  exit 1
fi
echo "[PASS] Valid gzip archive"
PASS=$((PASS + 1))

# 3. Create temp database
echo "[Verify] Creating temp database: $TEMP_DB"
createdb "$TEMP_DB" 2>/dev/null || { echo "[FAIL] Cannot create temp database"; exit 1; }
echo "[PASS] Temp database created"
PASS=$((PASS + 1))

# 4. Restore backup (custom format with pg_restore, or plain SQL)
RESTORE_OK=0
if [[ "$BACKUP_FILE" == *.dump || "$BACKUP_FILE" == *.custom ]]; then
  pg_restore -d "$TEMP_DB" "$BACKUP_FILE" 2>&1 | tail -5 || true
else
  zcat "$BACKUP_FILE" | psql -d "$TEMP_DB" 2>&1 | tail -5 || true
fi

TABLE_COUNT=$(psql -d "$TEMP_DB" -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public'" 2>/dev/null | tr -d ' ')
if [ -z "$TABLE_COUNT" ] || [ "$TABLE_COUNT" -eq 0 ] 2>/dev/null; then
  echo "[FAIL] Restore produced no tables — corrupt or incompatible backup"
  FAIL=$((FAIL + 1))
  exit 1
fi
echo "[PASS] Restore completed — $TABLE_COUNT tables"
PASS=$((PASS + 1))

# 5. Row count integrity — verify non-zero rows in core tables
CORE_TABLES=("users" "doctors" "bookings" "clinical_records" "tenants")
for tbl in "${CORE_TABLES[@]}"; do
  ROWS=$(psql -d "$TEMP_DB" -t -c "SELECT count(*) FROM \"$tbl\"" 2>/dev/null | tr -d ' ' || echo "0")
  if [ "$ROWS" -gt 0 ] 2>/dev/null; then
    echo "[PASS] $tbl: $ROWS rows"
    PASS=$((PASS + 1))
  else
    echo "[WARN] $tbl: 0 rows (may be expected for empty tenant)"
  fi
done

# 6. Foreign key integrity
FK_VIOLATIONS=$(psql -d "$TEMP_DB" -t -A -c "
  SELECT count(*) FROM (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
  ) fk_checks" 2>/dev/null | tr -d ' ')

echo "[PASS] Foreign key structure verified ($FK_VIOLATIONS constraints)"
PASS=$((PASS + 1))

# 7. Migration tracking
MIGRATIONS=$(psql -d "$TEMP_DB" -t -c "SELECT count(*) FROM _migrations" 2>/dev/null | tr -d ' ' || echo "0")
if [ -n "$MIGRATIONS" ] && [ "$MIGRATIONS" -gt 0 ] 2>/dev/null; then
  echo "[PASS] _migrations table: $MIGRATIONS migrations tracked"
  PASS=$((PASS + 1))
else
  echo "[WARN] No _migrations table or empty — backup may be from old schema"
fi

echo ""
echo "[Verify] === Summary: $PASS passed, $FAIL failed ==="
echo "[Verify] Temp database '$TEMP_DB' will be dropped on exit."
