-- 015: Attachments (medical files attached to clinical entities)
CREATE TABLE IF NOT EXISTS attachments (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  entity_type TEXT NOT NULL CHECK (entity_type IN ('clinical_record', 'prescription', 'lab_result', 'booking', 'medical_history')),
  entity_id INT NOT NULL,
  original_name TEXT NOT NULL,
  stored_name TEXT NOT NULL,
  mime_type TEXT,
  size_bytes INT,
  uploaded_by INT,
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT fk_att_uploader FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_att_entity ON attachments(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_att_tenant ON attachments(tenant_id);
