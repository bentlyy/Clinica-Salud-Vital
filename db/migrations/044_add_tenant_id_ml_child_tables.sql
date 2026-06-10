-- 044: Add tenant_id to ML child tables for multi-tenant isolation

-- Add tenant_id to ml_run_params, backfill, set NOT NULL
ALTER TABLE ml_run_params ADD COLUMN IF NOT EXISTS tenant_id TEXT;
UPDATE ml_run_params mp SET tenant_id = mr.tenant_id FROM ml_runs mr WHERE mp.run_id = mr.id AND mp.tenant_id IS NULL;
ALTER TABLE ml_run_params ALTER COLUMN tenant_id SET NOT NULL;

-- Add tenant_id to ml_run_metrics
ALTER TABLE ml_run_metrics ADD COLUMN IF NOT EXISTS tenant_id TEXT;
UPDATE ml_run_metrics mm SET tenant_id = mr.tenant_id FROM ml_runs mr WHERE mm.run_id = mr.id AND mm.tenant_id IS NULL;
ALTER TABLE ml_run_metrics ALTER COLUMN tenant_id SET NOT NULL;

-- Add tenant_id to ml_run_artifacts
ALTER TABLE ml_run_artifacts ADD COLUMN IF NOT EXISTS tenant_id TEXT;
UPDATE ml_run_artifacts ma SET tenant_id = mr.tenant_id FROM ml_runs mr WHERE ma.run_id = mr.id AND ma.tenant_id IS NULL;
ALTER TABLE ml_run_artifacts ALTER COLUMN tenant_id SET NOT NULL;

-- Create indexes (corrected: ml_run_params, not ml_run_parameters)
CREATE INDEX IF NOT EXISTS idx_ml_run_params_tenant ON ml_run_params(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ml_run_metrics_tenant ON ml_run_metrics(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ml_run_artifacts_tenant ON ml_run_artifacts(tenant_id);

INSERT INTO _migrations (name, applied_at) VALUES ('044_add_tenant_id_ml_child_tables', NOW())
ON CONFLICT (name) DO NOTHING;
