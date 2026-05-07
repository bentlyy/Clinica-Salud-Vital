-- Laboratory Module Migration
-- NOTE: lab_tests, lab_requests, lab_request_items tables are already
-- created by db/init.sql with different schemas. This migration adds
-- the columns used by the laboratory module service layer.

-- Lab test catalog
CREATE TABLE IF NOT EXISTS lab_tests (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  unit VARCHAR(50),
  reference_min NUMERIC(10, 2),
  reference_max NUMERIC(10, 2),
  price NUMERIC(10, 2) NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add columns if lab_tests already exists from init.sql
ALTER TABLE lab_tests ADD COLUMN IF NOT EXISTS category VARCHAR(100);
ALTER TABLE lab_tests ADD COLUMN IF NOT EXISTS unit VARCHAR(50);
ALTER TABLE lab_tests ADD COLUMN IF NOT EXISTS reference_min NUMERIC(10, 2);
ALTER TABLE lab_tests ADD COLUMN IF NOT EXISTS reference_max NUMERIC(10, 2);
ALTER TABLE lab_tests ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;

-- Lab requests (orders)
CREATE TABLE IF NOT EXISTS lab_requests (
  id SERIAL PRIMARY KEY,
  request_number VARCHAR(50) UNIQUE NOT NULL,
  patient_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  doctor_id INTEGER REFERENCES doctors(id) ON DELETE SET NULL,
  clinical_record_id INTEGER REFERENCES clinical_records(id) ON DELETE SET NULL,
  priority VARCHAR(20) DEFAULT 'routine' CHECK (priority IN ('routine', 'urgent', 'emergency')),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'collected', 'in_progress', 'completed', 'cancelled')),
  notes TEXT,
  requested_at TIMESTAMP DEFAULT NOW(),
  collected_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add columns if lab_requests already exists from init.sql
ALTER TABLE lab_requests ADD COLUMN IF NOT EXISTS request_number VARCHAR(50) UNIQUE;
ALTER TABLE lab_requests ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'routine';
ALTER TABLE lab_requests ADD COLUMN IF NOT EXISTS collected_at TIMESTAMP;
ALTER TABLE lab_requests ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;
ALTER TABLE lab_requests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
ALTER TABLE lab_requests ADD COLUMN IF NOT EXISTS clinical_record_id INTEGER REFERENCES clinical_records(id) ON DELETE SET NULL;

-- Lab request items (tests ordered)
CREATE TABLE IF NOT EXISTS lab_request_items (
  id SERIAL PRIMARY KEY,
  lab_request_id INTEGER REFERENCES lab_requests(id) ON DELETE CASCADE,
  lab_test_id INTEGER REFERENCES lab_tests(id),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  result_value TEXT,
  result_notes TEXT,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add columns if lab_request_items already exists from init.sql
ALTER TABLE lab_request_items ADD COLUMN IF NOT EXISTS result_value TEXT;
ALTER TABLE lab_request_items ADD COLUMN IF NOT EXISTS result_notes TEXT;
ALTER TABLE lab_request_items ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;
ALTER TABLE lab_request_items ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_lab_request_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_lab_requests_updated_at ON lab_requests;
CREATE TRIGGER update_lab_requests_updated_at
  BEFORE UPDATE ON lab_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_lab_request_updated_at();

-- Sample data for lab tests (only if the migration-specific columns exist)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lab_tests' AND column_name = 'category') THEN
    INSERT INTO lab_tests (name, description, category, unit, price) VALUES
      ('Hemograma', 'Análisis completo de células sanguínea', 'Sangre', '%', 15000),
      ('Glucosa', 'Nivel de glucosa en sangre', 'Sangre', 'mg/dL', 8000),
      ('Colesterol Total', 'Colesterol total en sangre', 'Sangre', 'mg/dL', 10000),
      ('Triglicéridos', 'Nivel de triglicéridos', 'Sangre', 'mg/dL', 12000),
      ('Creatinina', 'Función renal', 'Sangre', 'mg/dL', 9000),
      ('Urea', 'Función renal', 'Sangre', 'mg/dL', 8500),
      ('Examen de Orina', 'Análisis completo de orina', 'Orina', '-', 12000),
      ('TSH', 'Función tiroidea', 'Sangre', 'mIU/L', 18000),
      ('T4 Libre', 'Función tiroidea', 'Sangre', 'ng/dL', 16000)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
