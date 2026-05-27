-- Clinical Records Module Migration

-- Tabla principal de historiales médicos
CREATE TABLE IF NOT EXISTS clinical_records (
  id SERIAL PRIMARY KEY,
  patient_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  doctor_id INTEGER REFERENCES doctors(id) ON DELETE CASCADE,
  booking_id INTEGER REFERENCES bookings(id) ON DELETE SET NULL,
  chief_complaint TEXT NOT NULL,
  anamnesis TEXT,
  vital_signs JSONB,
  physical_exam TEXT,
  diagnosis TEXT,
  cie10_codes TEXT[],
  treatment_plan TEXT,
  notes TEXT,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'completed', 'cancelled')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabla de recetas médicas
CREATE TABLE IF NOT EXISTS prescriptions (
  id SERIAL PRIMARY KEY,
  clinical_record_id INTEGER REFERENCES clinical_records(id) ON DELETE CASCADE,
  medication VARCHAR(255) NOT NULL,
  dosage VARCHAR(100) NOT NULL,
  frequency VARCHAR(100) NOT NULL,
  duration VARCHAR(100),
  instructions TEXT,
  route VARCHAR(50) DEFAULT 'oral',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabla de diagnósticos CIE-10 (catálogo)
CREATE TABLE IF NOT EXISTS cie10_catalog (
  id SERIAL PRIMARY KEY,
  code VARCHAR(10) UNIQUE NOT NULL,
  description VARCHAR(500) NOT NULL,
  category VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Índices para búsqueda eficiente
CREATE INDEX IF NOT EXISTS idx_clinical_records_patient ON clinical_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_clinical_records_doctor ON clinical_records(doctor_id);
CREATE INDEX IF NOT EXISTS idx_clinical_records_booking ON clinical_records(booking_id);
CREATE INDEX IF NOT EXISTS idx_clinical_records_status ON clinical_records(status);
CREATE INDEX IF NOT EXISTS idx_prescriptions_record ON prescriptions(clinical_record_id);
CREATE INDEX IF NOT EXISTS idx_cie10_code ON cie10_catalog(code);

-- Trigger para actualizar updated_at
DROP TRIGGER IF EXISTS update_clinical_records_updated_at ON clinical_records;
CREATE TRIGGER update_clinical_records_updated_at
  BEFORE UPDATE ON clinical_records
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
