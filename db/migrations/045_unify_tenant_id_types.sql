-- 045: Unify tenant_id column types to TEXT (from VARCHAR(255))
-- Some tables were created with VARCHAR(255) instead of TEXT

ALTER TABLE IF EXISTS phi_access_log ALTER COLUMN tenant_id TYPE TEXT;
ALTER TABLE IF EXISTS encryption_keys ALTER COLUMN tenant_id TYPE TEXT;
ALTER TABLE IF EXISTS user_consents ALTER COLUMN tenant_id TYPE TEXT;
ALTER TABLE IF EXISTS data_retention_policy ALTER COLUMN tenant_id TYPE TEXT;
ALTER TABLE IF EXISTS clinical_record_versions ALTER COLUMN tenant_id TYPE TEXT;

INSERT INTO _migrations (name, applied_at) VALUES ('045_unify_tenant_id_types', NOW())
ON CONFLICT (name) DO NOTHING;
