-- Audit HMAC chain: adds hash and previous_hash columns for tamper detection
ALTER TABLE audit_logs
  ADD COLUMN IF NOT EXISTS hash VARCHAR(64),
  ADD COLUMN IF NOT EXISTS previous_hash VARCHAR(64);

CREATE INDEX IF NOT EXISTS idx_audit_logs_hash ON audit_logs (hash);
CREATE INDEX IF NOT EXISTS idx_audit_logs_previous_hash ON audit_logs (previous_hash);
