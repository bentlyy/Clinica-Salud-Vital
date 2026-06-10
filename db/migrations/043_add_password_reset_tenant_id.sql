-- 043: Add tenant_id to password_reset_tokens for multi-tenant isolation

-- Add tenant_id column
ALTER TABLE password_reset_tokens ADD COLUMN IF NOT EXISTS tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE;

-- Backfill existing tokens to default tenant (fresh installs or single-tenant)
UPDATE password_reset_tokens SET tenant_id = 'default' WHERE tenant_id IS NULL;

-- Make it NOT NULL
ALTER TABLE password_reset_tokens ALTER COLUMN tenant_id SET NOT NULL;

-- Create composite index for lookup performance
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_tenant_token ON password_reset_tokens(tenant_id, token);

-- Log the migration
INSERT INTO _migrations (name, applied_at) VALUES ('043_add_password_reset_tenant_id', NOW())
ON CONFLICT (name) DO NOTHING;
