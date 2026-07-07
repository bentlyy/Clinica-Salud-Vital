-- 005: Lab Equipment, Reagents & Quality Control
CREATE TABLE IF NOT EXISTS lab_equipment (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  model VARCHAR(100),
  serial_number VARCHAR(100),
  lab_area_id INTEGER REFERENCES lab_areas(id),
  connection_type VARCHAR(50) CHECK (connection_type IN ('manual', 'hl7', 'astm', 'serial', 'file')),
  ip_address VARCHAR(50),
  port INTEGER,
  active BOOLEAN DEFAULT true,
  status VARCHAR(20) DEFAULT 'online' CHECK (status IN ('online', 'offline', 'maintenance', 'calibration')),
  last_maintenance TIMESTAMP,
  next_maintenance TIMESTAMP,
  last_calibration TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  tenant_id TEXT NOT NULL DEFAULT 'default'
);

CREATE TABLE IF NOT EXISTS lab_reagents (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  catalog_number VARCHAR(100),
  lot_number VARCHAR(100),
  supplier VARCHAR(200),
  stock_quantity DECIMAL(10, 2) DEFAULT 0,
  unit VARCHAR(20),
  min_stock DECIMAL(10, 2) DEFAULT 0,
  current_stock DECIMAL(10, 2) DEFAULT 0,
  expiration_date TIMESTAMP,
  storage_conditions VARCHAR(200),
  received_at TIMESTAMP,
  opened_at TIMESTAMP,
  opened_by INTEGER REFERENCES users(id),
  finished_at TIMESTAMP,
  lab_test_id INTEGER REFERENCES lab_tests(id),
  lab_area_id INTEGER REFERENCES lab_areas(id),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  tenant_id TEXT NOT NULL DEFAULT 'default'
);

CREATE TABLE IF NOT EXISTS lab_qc_records (
  id SERIAL PRIMARY KEY,
  lab_test_id INTEGER REFERENCES lab_tests(id),
  lab_area_id INTEGER REFERENCES lab_areas(id),
  sample_id INTEGER REFERENCES lab_samples(id),
  equipment_id INTEGER REFERENCES lab_equipment(id),
  reagent_id INTEGER REFERENCES lab_reagents(id),
  qc_type VARCHAR(20) NOT NULL CHECK (qc_type IN ('internal', 'external', 'calibration', 'proficiency')),
  control_name VARCHAR(100),
  lot_number VARCHAR(100),
  expiration_date TIMESTAMP,
  measured_value DECIMAL(10, 2),
  expected_min DECIMAL(10, 2),
  expected_max DECIMAL(10, 2),
  status VARCHAR(20) CHECK (status IN ('passed', 'failed', 'warning', 'review')),
  performed_by INTEGER REFERENCES users(id),
  reviewed_by INTEGER REFERENCES users(id),
  performed_at TIMESTAMP DEFAULT NOW(),
  reviewed_at TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  tenant_id TEXT NOT NULL DEFAULT 'default'
);

CREATE TABLE IF NOT EXISTS lab_notifications (
  id SERIAL PRIMARY KEY,
  type VARCHAR(50) NOT NULL CHECK (type IN ('critical_result', 'qc_failure', 'equipment_alert', 'stock_alert', 'sla_breach', 'repeated_result')),
  title VARCHAR(200),
  message TEXT,
  severity VARCHAR(20) CHECK (severity IN ('info', 'warning', 'critical')),
  acknowledged BOOLEAN DEFAULT false,
  acknowledged_by INTEGER REFERENCES users(id),
  acknowledged_at TIMESTAMP,
  lab_request_item_id INTEGER REFERENCES lab_request_items(id),
  lab_request_id INTEGER REFERENCES lab_requests(id),
  link TEXT, -- deep link to navigate
  created_at TIMESTAMP DEFAULT NOW(),
  tenant_id TEXT NOT NULL DEFAULT 'default'
);

CREATE INDEX IF NOT EXISTS idx_lab_qc_test ON lab_qc_records(lab_test_id, performed_at);
CREATE INDEX IF NOT EXISTS idx_lab_qc_area ON lab_qc_records(lab_area_id);
CREATE INDEX IF NOT EXISTS idx_lab_reagents_area ON lab_reagents(lab_area_id);
CREATE INDEX IF NOT EXISTS idx_lab_equipment_area ON lab_equipment(lab_area_id);
CREATE INDEX IF NOT EXISTS idx_lab_notifications_unread ON lab_notifications(tenant_id, acknowledged) WHERE acknowledged = false;
