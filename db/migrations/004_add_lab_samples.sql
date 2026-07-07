-- 004: Lab Samples - Trazabilidad física de muestras
CREATE TABLE IF NOT EXISTS lab_samples (
  id SERIAL PRIMARY KEY,
  lab_request_item_id INTEGER REFERENCES lab_request_items(id) ON DELETE CASCADE,
  lab_request_id INTEGER REFERENCES lab_requests(id) ON DELETE CASCADE,
  sample_type VARCHAR(50) NOT NULL,
  sample_code VARCHAR(50) UNIQUE,
  barcode TEXT,
  qr_code TEXT,
  volume DECIMAL(10, 2),
  container_type VARCHAR(50),
  collection_time TIMESTAMP,
  reception_time TIMESTAMP,
  received_by INTEGER REFERENCES users(id),
  verification_time TIMESTAMP,
  verified_by INTEGER REFERENCES users(id),
  assigned_tech_id INTEGER REFERENCES users(id),
  assigned_equipment_id INTEGER,
  processing_start TIMESTAMP,
  processing_end TIMESTAMP,
  qc_status VARCHAR(20) DEFAULT 'pending' CHECK (qc_status IN ('pending', 'passed', 'failed', 'review')),
  qc_notes TEXT,
  rejection_reason TEXT,
  is_repeated BOOLEAN DEFAULT false,
  repeated_from_id INTEGER REFERENCES lab_samples(id),
  storage_location VARCHAR(100),
  disposal_date TIMESTAMP,
  notes TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'received', 'verified', 'assigned', 'processing', 'completed', 'rejected', 'disposed')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  tenant_id TEXT NOT NULL DEFAULT 'default'
);

-- Lab result history for delta check
CREATE TABLE IF NOT EXISTS lab_result_history (
  id SERIAL PRIMARY KEY,
  lab_request_item_id INTEGER REFERENCES lab_request_items(id),
  patient_id INTEGER REFERENCES users(id),
  lab_test_id INTEGER REFERENCES lab_tests(id),
  result_value TEXT,
  previous_result_value TEXT,
  delta_percentage DECIMAL(10, 2),
  delta_check_status VARCHAR(20) CHECK (delta_check_status IN ('normal', 'warning', 'critical')),
  checked_at TIMESTAMP DEFAULT NOW(),
  tenant_id TEXT NOT NULL DEFAULT 'default'
);

CREATE INDEX IF NOT EXISTS idx_lab_result_history_patient ON lab_result_history(patient_id, lab_test_id);
CREATE INDEX IF NOT EXISTS idx_lab_samples_request ON lab_samples(lab_request_id);
CREATE INDEX IF NOT EXISTS idx_lab_samples_code ON lab_samples(sample_code);
