-- 050: Fix audit_logs column names (entity_type→resource_type, entity_id→resource_id)
-- The service layer uses resource_type/resource_id but the table has entity_type/entity_id

ALTER TABLE IF EXISTS audit_logs RENAME COLUMN entity_type TO resource_type;
ALTER TABLE IF EXISTS audit_logs RENAME COLUMN entity_id TO resource_id;

-- Update init.sql hash since schema changed
-- (handled by schema drift detector in app.ts)

INSERT INTO _migrations (name, applied_at) VALUES ('050_fix_audit_logs_column_names', NOW())
ON CONFLICT (name) DO NOTHING;
