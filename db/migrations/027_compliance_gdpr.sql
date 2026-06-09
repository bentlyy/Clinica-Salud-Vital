-- Migration: GDPR/HIPAA compliance tables
-- User consents, PHI audit, data retention

-- 1. User consents for GDPR
CREATE TABLE IF NOT EXISTS user_consents (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tenant_id VARCHAR(255) NOT NULL,
  consent_type VARCHAR(100) NOT NULL,
  granted BOOLEAN NOT NULL DEFAULT false,
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  ip_address INET,
  user_agent TEXT,
  UNIQUE (user_id, tenant_id, consent_type)
);

CREATE INDEX IF NOT EXISTS idx_user_consents_user ON user_consents(user_id, tenant_id);

-- 2. Data retention policy (mark records for deletion)
CREATE TABLE IF NOT EXISTS data_retention_policy (
  id SERIAL PRIMARY KEY,
  tenant_id VARCHAR(255) NOT NULL,
  entity_type VARCHAR(100) NOT NULL,
  retention_days INTEGER NOT NULL,
  action VARCHAR(20) DEFAULT 'anonymize' CHECK (action IN ('anonymize', 'delete')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. PHI access audit (HIPAA required)
CREATE TABLE IF NOT EXISTS phi_access_log (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  tenant_id VARCHAR(255) NOT NULL,
  action VARCHAR(50) NOT NULL,
  entity_type VARCHAR(100) NOT NULL,
  entity_id INTEGER,
  accessed_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,
  duration_ms INTEGER
);

CREATE INDEX IF NOT EXISTS idx_phi_access_log_tenant_date
  ON phi_access_log(tenant_id, accessed_at DESC);

CREATE INDEX IF NOT EXISTS idx_phi_access_log_user
  ON phi_access_log(user_id, accessed_at DESC);

-- 4. Encryption key tracking
CREATE TABLE IF NOT EXISTS encryption_keys (
  id SERIAL PRIMARY KEY,
  tenant_id VARCHAR(255) NOT NULL,
  key_identifier VARCHAR(64) UNIQUE NOT NULL,
  key_data_encrypted TEXT NOT NULL,
  algorithm VARCHAR(50) DEFAULT 'aes-256-gcm',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  rotated_at TIMESTAMPTZ,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'rotated', 'compromised', 'retired'))
);

-- Apply RLS to new tables
ALTER TABLE IF EXISTS user_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_consents FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS phi_access_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS phi_access_log FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS encryption_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS encryption_keys FORCE ROW LEVEL SECURITY;

-- RLS policies for new tables
DROP POLICY IF EXISTS tenant_isolation ON user_consents;
CREATE POLICY tenant_isolation ON user_consents FOR ALL
  USING (
    current_setting('app.tenant_id', true) IS NULL
    OR current_setting('app.tenant_id', true) = ''
    OR current_setting('app.tenant_id', true) = 'superadmin'
    OR tenant_id = current_setting('app.tenant_id', true)
  );

DROP POLICY IF EXISTS tenant_isolation ON phi_access_log;
CREATE POLICY tenant_isolation ON phi_access_log FOR ALL
  USING (
    current_setting('app.tenant_id', true) IS NULL
    OR current_setting('app.tenant_id', true) = ''
    OR current_setting('app.tenant_id', true) = 'superadmin'
    OR tenant_id = current_setting('app.tenant_id', true)
  );

DROP POLICY IF EXISTS tenant_isolation ON encryption_keys;
CREATE POLICY tenant_isolation ON encryption_keys FOR ALL
  USING (
    current_setting('app.tenant_id', true) IS NULL
    OR current_setting('app.tenant_id', true) = ''
    OR current_setting('app.tenant_id', true) = 'superadmin'
    OR tenant_id = current_setting('app.tenant_id', true)
  );
