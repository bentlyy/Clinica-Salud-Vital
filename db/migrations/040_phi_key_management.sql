-- Add key_version column to encryption_keys for rotation tracking
ALTER TABLE encryption_keys ADD COLUMN IF NOT EXISTS key_version INTEGER NOT NULL DEFAULT 1;

-- Add index for key rotation lookup
CREATE INDEX IF NOT EXISTS idx_encryption_keys_tenant_active
  ON encryption_keys(tenant_id, status) WHERE status = 'active';

-- Ensure phi_access_log has all necessary columns (table created in 027)
ALTER TABLE phi_access_log ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_phi_access_log_tenant
  ON phi_access_log(tenant_id, accessed_at DESC);
