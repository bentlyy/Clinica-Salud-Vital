CREATE TABLE IF NOT EXISTS medical_history (
  id SERIAL PRIMARY KEY,
  patient_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  condition VARCHAR(500) NOT NULL,
  onset_date DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'chronic', 'family')),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  tenant_id TEXT NOT NULL DEFAULT 'default'
);

CREATE INDEX IF NOT EXISTS idx_medical_history_patient ON medical_history(patient_id);
CREATE INDEX IF NOT EXISTS idx_medical_history_tenant ON medical_history(tenant_id);
