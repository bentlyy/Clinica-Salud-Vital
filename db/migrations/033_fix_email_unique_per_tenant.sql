-- Migration: Make email UNIQUE per-tenant instead of globally unique
-- CRÍTICO: El UNIQUE global impedía que dos clínicas usaran el mismo email

BEGIN;

-- 1. Drop the global UNIQUE constraint on email
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_key;

-- 2. Also drop the RUT global UNIQUE
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_rut_key;

-- 3. Add composite UNIQUE(tenant_id, email) for tenant-scoped uniqueness
ALTER TABLE users ADD CONSTRAINT users_tenant_email_key UNIQUE (tenant_id, email);

-- 4. Add composite UNIQUE(tenant_id, rut) for tenant-scoped uniqueness
CREATE UNIQUE INDEX IF NOT EXISTS users_tenant_rut_idx ON users (tenant_id, rut) WHERE rut IS NOT NULL;

-- 5. Add unique constraint for specialties per tenant
ALTER TABLE specialties DROP CONSTRAINT IF EXISTS specialties_name_key;
ALTER TABLE specialties ADD CONSTRAINT specialties_tenant_name_key UNIQUE (tenant_id, name);

-- 6. Plans code remains globally unique (correct by design)

-- 7. Create idempotency_keys table for DB-backed idempotency (billing)
CREATE TABLE IF NOT EXISTS idempotency_keys (
  id SERIAL PRIMARY KEY,
  key VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_idempotency_keys_expires ON idempotency_keys(expires_at);
CREATE INDEX IF NOT EXISTS idx_idempotency_keys_key ON idempotency_keys(key);

-- 8. Webhook deliveries now joins with webhooks for tenant_id filter

COMMIT;
