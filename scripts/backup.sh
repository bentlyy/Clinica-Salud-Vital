#!/usr/bin/env bash
# Production database backup runner (Linux / CI).
# Parses DATABASE_URL into libpq env vars so the password never appears in argv.
#
# Usage:
#   DATABASE_URL='postgresql://user:pass@host:5432/clinic' ./scripts/backup.sh [output_dir]
#
# Optional env:
#   BACKUP_RETENTION=30   local dumps to keep (default 30)
#   S3_BUCKET=my-bucket   also uploads to s3://<bucket>/backups/ (requires aws CLI + AWS_* env)
#
# Validate the result by restoring it to a throwaway database:
#   DATABASE_URL=... ./scripts/backup-verify.sh backups/clinic_backup_<timestamp>.dump

set -euo pipefail

OUTPUT_DIR="${1:-backups}"
DATABASE_URL="${DATABASE_URL:?DATABASE_URL not set}"
RETENTION="${BACKUP_RETENTION:-30}"
TS="$(date +%Y%m%d_%H%M%S)"
FILE="$OUTPUT_DIR/clinic_backup_$TS.dump"

mkdir -p "$OUTPUT_DIR"

# --- Parse DATABASE_URL into libpq env vars (password stays out of argv) ---
if command -v python3 >/dev/null 2>&1; then
  eval "$(python3 - <<'PY'
import os, re, shlex, urllib.parse
url = os.environ['DATABASE_URL']
m = re.match(r'^postgres(?:ql)?://(?:([^:@/]+)(?::([^@/]*))?@)?([^:/?]+)(?::(\d+))?/([^:?]+)', url, re.I)
if not m:
    raise SystemExit('[backup] ERROR: cannot parse DATABASE_URL')
user = m.group(1) or ''
pw = urllib.parse.unquote(m.group(2) or '')
host = m.group(3)
port = m.group(4) or '5432'
db = urllib.parse.unquote(m.group(5))
print(f'export PGHOST={shlex.quote(host)}')
print(f'export PGPORT={shlex.quote(port)}')
print(f'export PGUSER={shlex.quote(user)}')
print(f'export PGPASSWORD={shlex.quote(pw)}')
print(f'export PGDATABASE={shlex.quote(db)}')
q = urllib.parse.parse_qs(url.split('?', 1)[1]) if '?' in url else {}
if 'sslmode' in q:
    print(f'export PGSSLMODE={shlex.quote(q["sslmode"][0])}')
PY
)"
else
  echo "[backup][warn] python3 not found — falling back to URL-based pg_dump (password visible in process list)" >&2
fi

echo "[backup] dumping $PGDATABASE@$PGHOST:$PGPORT"
pg_dump -Fc -b -v -f "$FILE"

if ! pg_restore --list "$FILE" >/dev/null 2>&1; then
  echo "[backup] ERROR: file is not a valid custom-format dump" >&2
  rm -f "$FILE"
  exit 1
fi

SIZE=$(du -h "$FILE" | cut -f1)
echo "[backup] created $FILE ($SIZE)"

# --- Optional S3 upload (IMAGE class retention via lifecycle rules in AWS) ---
if [ -n "${S3_BUCKET:-}" ]; then
  if command -v aws >/dev/null 2>&1; then
    echo "[backup] uploading to s3://$S3_BUCKET/backups/"
    aws s3 cp "$FILE" "s3://$S3_BUCKET/backups/" --storage-class STANDARD_IA
  else
    echo "[backup][warn] S3_BUCKET set but aws CLI not found; skipping upload" >&2
  fi
fi

# --- Local retention: keep the newest N dumps ---
mapfile -t OLD < <(ls -1t "$OUTPUT_DIR"/clinic_backup_*.dump 2>/dev/null | tail -n +$((RETENTION + 1)))
for old in "${OLD[@]}"; do
  rm -f "$old"
  echo "[backup] removed old dump: $old"
done

unset PGPASSWORD
echo "[backup] complete: $FILE"