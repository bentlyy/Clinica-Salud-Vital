-- Migration: Clinical record versioning with audit trail
-- Captures snapshot BEFORE any UPDATE, enables rollback and HIPAA audit

CREATE TABLE IF NOT EXISTS clinical_record_versions (
  id SERIAL PRIMARY KEY,
  clinical_record_id INTEGER NOT NULL REFERENCES clinical_records(id) ON DELETE CASCADE,
  tenant_id VARCHAR(255) NOT NULL,
  version INTEGER NOT NULL,
  snapshot JSONB NOT NULL,
  changed_by INTEGER REFERENCES users(id),
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  change_reason VARCHAR(255),
  UNIQUE (clinical_record_id, version)
);

CREATE INDEX IF NOT EXISTS idx_cr_versions_record
  ON clinical_record_versions(clinical_record_id, version DESC);
CREATE INDEX IF NOT EXISTS idx_cr_versions_tenant
  ON clinical_record_versions(tenant_id, changed_at DESC);

-- Trigger function: snapshot before update
CREATE OR REPLACE FUNCTION fn_snapshot_clinical_record()
RETURNS TRIGGER AS $$
DECLARE
  next_version INTEGER;
BEGIN
  SELECT COALESCE(MAX(version), 0) + 1 INTO next_version
  FROM clinical_record_versions
  WHERE clinical_record_id = OLD.id;

  INSERT INTO clinical_record_versions (
    clinical_record_id, tenant_id, version, snapshot, changed_by, change_reason
  ) VALUES (
    OLD.id, OLD.tenant_id, next_version,
    row_to_json(OLD)::jsonb,
    NULL,
    TG_ARGV[0]
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to clinical_records
DROP TRIGGER IF EXISTS trg_clinical_record_version ON clinical_records;
CREATE TRIGGER trg_clinical_record_version
  BEFORE UPDATE ON clinical_records
  FOR EACH ROW
  EXECUTE FUNCTION fn_snapshot_clinical_record('auto_version');

-- RLS for versions table
ALTER TABLE IF EXISTS clinical_record_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS clinical_record_versions FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON clinical_record_versions;
CREATE POLICY tenant_isolation ON clinical_record_versions FOR ALL
  USING (tenant_id = current_setting('app.tenant_id', true));

-- Allow superadmin to view all versions
DROP POLICY IF EXISTS superadmin_access ON clinical_record_versions;
CREATE POLICY superadmin_access ON clinical_record_versions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM users
    WHERE id = current_setting('app.user_id', true)::INTEGER
    AND role = 'superadmin'
  ));
