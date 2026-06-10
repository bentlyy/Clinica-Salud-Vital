-- 051: Add index on audit_logs hash chain for integrity verification
CREATE INDEX IF NOT EXISTS idx_audit_logs_hash_chain ON audit_logs(previous_hash, hash);
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_created ON audit_logs(tenant_id, created_at DESC);

INSERT INTO _migrations (name, applied_at) VALUES ('051_add_audit_hash_index', NOW())
ON CONFLICT (name) DO NOTHING;
