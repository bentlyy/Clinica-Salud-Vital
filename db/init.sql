CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT DEFAULT 'user',
  rut TEXT UNIQUE,
  phone TEXT,
  blocked_until TIMESTAMP,
  no_show_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE doctors (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  specialty TEXT NOT NULL,
  email TEXT,
  user_id INT UNIQUE,
  slot_duration INT DEFAULT 30,
  CONSTRAINT fk_doctor_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT check_slot_duration CHECK (slot_duration IN (15, 30, 45, 60))
);

CREATE TABLE bookings (
  id SERIAL PRIMARY KEY,
  doctor_id INT NOT NULL,
  user_id INT,
  date DATE NOT NULL,
  time TIME NOT NULL,
  duration INT DEFAULT 30,
  status TEXT DEFAULT 'pending',
  confirmed BOOLEAN DEFAULT FALSE,
  confirmation_token TEXT UNIQUE,
  guest_rut TEXT,
  guest_name TEXT,
  guest_email TEXT,
  guest_phone TEXT,
  reminder_1h_sent BOOLEAN DEFAULT FALSE,
  reminder_24h_sent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_doctor FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT check_guest_or_user
    CHECK (user_id IS NOT NULL OR (guest_rut IS NOT NULL AND guest_email IS NOT NULL)),
  CONSTRAINT unique_booking UNIQUE (doctor_id, date, time),
  CONSTRAINT check_future_date CHECK (date >= CURRENT_DATE),
  CONSTRAINT check_duration CHECK (duration > 0 AND duration <= 480)
);

CREATE TABLE doctor_availability (
  id SERIAL PRIMARY KEY,
  doctor_id INT NOT NULL,
  day_of_week INT NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  CONSTRAINT fk_doctor_availability FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
  CONSTRAINT check_time_range CHECK (start_time < end_time)
);

CREATE TABLE doctor_exceptions (
  id SERIAL PRIMARY KEY,
  doctor_id INT NOT NULL,
  date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  is_full_day BOOLEAN DEFAULT FALSE,
  CONSTRAINT fk_doctor_exception FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
  CONSTRAINT check_full_day_consistency CHECK (
    (is_full_day = true AND start_time IS NULL AND end_time IS NULL)
    OR (is_full_day = false AND start_time IS NOT NULL AND end_time IS NOT NULL AND start_time < end_time)
  )
);

-- Clinical Records Module
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

CREATE TABLE IF NOT EXISTS cie10_catalog (
  id SERIAL PRIMARY KEY,
  code VARCHAR(10) UNIQUE NOT NULL,
  description VARCHAR(500) NOT NULL,
  category VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id INTEGER,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Billing Module
CREATE TABLE IF NOT EXISTS invoices (
  id SERIAL PRIMARY KEY,
  patient_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  booking_id INTEGER REFERENCES bookings(id) ON DELETE SET NULL,
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled', 'refunded')),
  due_date DATE,
  issued_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS invoice_items (
  id SERIAL PRIMARY KEY,
  invoice_id INTEGER REFERENCES invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  quantity INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  invoice_id INTEGER REFERENCES invoices(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  method VARCHAR(50) CHECK (method IN ('cash', 'card', 'transfer', 'insurance')),
  reference VARCHAR(100),
  status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  paid_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS insurance_claims (
  id SERIAL PRIMARY KEY,
  invoice_id INTEGER REFERENCES invoices(id) ON DELETE SET NULL,
  patient_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  insurance_provider VARCHAR(100),
  policy_number VARCHAR(50),
  claim_number VARCHAR(50) UNIQUE,
  amount DECIMAL(10, 2) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'paid')),
  submitted_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Laboratory Module
CREATE TABLE IF NOT EXISTS lab_tests (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  code VARCHAR(50) UNIQUE,
  price DECIMAL(10, 2),
  reference_ranges JSONB,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lab_requests (
  id SERIAL PRIMARY KEY,
  patient_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  doctor_id INTEGER REFERENCES doctors(id) ON DELETE SET NULL,
  clinical_record_id INTEGER REFERENCES clinical_records(id) ON DELETE SET NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  notes TEXT,
  requested_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lab_request_items (
  id SERIAL PRIMARY KEY,
  lab_request_id INTEGER REFERENCES lab_requests(id) ON DELETE CASCADE,
  lab_test_id INTEGER REFERENCES lab_tests(id) ON DELETE CASCADE,
  priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'urgent')),
  results JSONB,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  notes TEXT
);

-- RBAC Module
CREATE TABLE IF NOT EXISTS permissions (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS role_permissions (
  id SERIAL PRIMARY KEY,
  role VARCHAR(50) NOT NULL,
  permission_id INTEGER REFERENCES permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(role, permission_id)
);

CREATE TABLE IF NOT EXISTS user_permissions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  permission_id INTEGER REFERENCES permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, permission_id)
);

-- ML Module Tables (schema matches migrate.sql + app code in ml.service.ts)
CREATE TABLE IF NOT EXISTS ml_prediction_history (
  id SERIAL PRIMARY KEY,
  model_type TEXT NOT NULL,
  input_data JSONB NOT NULL,
  prediction_result JSONB NOT NULL,
  confidence TEXT,
  prediction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  doctor_id INT,
  user_id INT,
  booking_id INT,
  actual_result BOOLEAN,
  is_correct BOOLEAN,
  error_message TEXT
);

CREATE TABLE IF NOT EXISTS ml_model_metrics (
  id SERIAL PRIMARY KEY,
  model_type TEXT NOT NULL,
  trained_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  duration_ms INT,
  samples_used INT,
  accuracy FLOAT,
  loss_value FLOAT,
  status TEXT DEFAULT 'success',
  error_message TEXT
);

CREATE TABLE IF NOT EXISTS ml_demand_forecast (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL,
  predicted_demand INT NOT NULL,
  actual_demand INT,
  confidence TEXT,
  generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  model_version TEXT DEFAULT 'v1'
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bookings_doctor ON bookings(doctor_id);
CREATE INDEX IF NOT EXISTS idx_bookings_user   ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_date   ON bookings(date);
CREATE INDEX IF NOT EXISTS idx_bookings_doctor_date ON bookings(doctor_id, date);
CREATE INDEX IF NOT EXISTS idx_bookings_guest_rut ON bookings(guest_rut);
CREATE INDEX IF NOT EXISTS idx_bookings_confirmation_token ON bookings(confirmation_token);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_confirmed ON bookings(confirmed);

CREATE INDEX IF NOT EXISTS idx_availability_doctor ON doctor_availability(doctor_id);

CREATE INDEX IF NOT EXISTS idx_exceptions_doctor ON doctor_exceptions(doctor_id);
CREATE INDEX IF NOT EXISTS idx_exceptions_date   ON doctor_exceptions(date);
CREATE INDEX IF NOT EXISTS idx_exceptions_doctor_date ON doctor_exceptions(doctor_id, date);

CREATE INDEX IF NOT EXISTS idx_users_rut ON users(rut);
CREATE INDEX IF NOT EXISTS idx_users_rut_clean ON users(REPLACE(REPLACE(rut, '.', ''), '-', '')) WHERE rut IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_user_date_status ON bookings(user_id, date, status);
CREATE INDEX IF NOT EXISTS idx_bookings_doctor_date_status ON bookings(doctor_id, date, status);
CREATE INDEX IF NOT EXISTS idx_clinical_records_doctor_status_date ON clinical_records(doctor_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_clinical_records_patient ON clinical_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_clinical_records_doctor ON clinical_records(doctor_id);
CREATE INDEX IF NOT EXISTS idx_clinical_records_booking ON clinical_records(booking_id);
CREATE INDEX IF NOT EXISTS idx_clinical_records_status ON clinical_records(status);
CREATE INDEX IF NOT EXISTS idx_prescriptions_record ON prescriptions(clinical_record_id);
CREATE INDEX IF NOT EXISTS idx_cie10_code ON cie10_catalog(code);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_invoices_patient ON invoices(patient_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_booking ON invoices(booking_id);

CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

CREATE INDEX IF NOT EXISTS idx_insurance_claims_patient ON insurance_claims(patient_id);
CREATE INDEX IF NOT EXISTS idx_insurance_claims_status ON insurance_claims(status);

CREATE INDEX IF NOT EXISTS idx_lab_tests_code ON lab_tests(code);

CREATE INDEX IF NOT EXISTS idx_lab_requests_patient ON lab_requests(patient_id);
CREATE INDEX IF NOT EXISTS idx_lab_requests_status ON lab_requests(status);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices(created_at);

-- Function for updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers
DROP TRIGGER IF EXISTS update_clinical_records_updated_at ON clinical_records;
CREATE TRIGGER update_clinical_records_updated_at
  BEFORE UPDATE ON clinical_records
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_invoices_updated_at ON invoices;
CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_insurance_claims_updated_at ON insurance_claims;
CREATE TRIGGER update_insurance_claims_updated_at
  BEFORE UPDATE ON insurance_claims
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_lab_requests_updated_at ON lab_requests;
CREATE TRIGGER update_lab_requests_updated_at
  BEFORE UPDATE ON lab_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Seed permissions
INSERT INTO permissions (name, description) VALUES
  ('bookings:create', 'Crear reservas'),
  ('bookings:read', 'Ver reservas'),
  ('bookings:update', 'Actualizar reservas'),
  ('bookings:delete', 'Eliminar reservas'),
  ('patients:read', 'Ver pacientes'),
  ('patients:create', 'Crear pacientes'),
  ('patients:update', 'Actualizar pacientes'),
  ('clinical:read', 'Ver historiales clínicos'),
  ('clinical:create', 'Crear historiales clínicos'),
  ('clinical:update', 'Actualizar historiales clínicos')
ON CONFLICT (name) DO NOTHING;

-- Seed role_permissions
DO $$
DECLARE
  admin_perms TEXT[] := ARRAY['bookings:create', 'bookings:read', 'bookings:update', 'bookings:delete', 'patients:read', 'patients:create', 'patients:update', 'clinical:read', 'clinical:create', 'clinical:update'];
  doctor_perms TEXT[] := ARRAY['bookings:read', 'bookings:update', 'patients:read', 'clinical:read', 'clinical:create', 'clinical:update'];
  user_perms TEXT[] := ARRAY['bookings:create', 'bookings:read'];
  perm_name TEXT;
BEGIN
  FOREACH perm_name IN ARRAY admin_perms LOOP
    INSERT INTO role_permissions (role, permission_id)
    SELECT 'admin', id FROM permissions WHERE name = perm_name
    ON CONFLICT (role, permission_id) DO NOTHING;
  END LOOP;
  
  FOREACH perm_name IN ARRAY doctor_perms LOOP
    INSERT INTO role_permissions (role, permission_id)
    SELECT 'doctor', id FROM permissions WHERE name = perm_name
    ON CONFLICT (role, permission_id) DO NOTHING;
  END LOOP;
  
  FOREACH perm_name IN ARRAY user_perms LOOP
    INSERT INTO role_permissions (role, permission_id)
    SELECT 'user', id FROM permissions WHERE name = perm_name
    ON CONFLICT (role, permission_id) DO NOTHING;
  END LOOP;
END $$;

-- Seed CIE-10 catalog
INSERT INTO cie10_catalog (code, description, category) VALUES
  ('I10', 'Hipertensión esencial', 'Enfermedades del sistema circulatorio'),
  ('E11', 'Diabetes mellitus tipo 2', 'Enfermedades endocrinas'),
  ('J20', 'Bronquitis aguda', 'Enfermedades del sistema respiratorio'),
  ('K29', 'Gastritis', 'Enfermedades del sistema digestivo'),
  ('M19', 'Artrosis', 'Enfermedades del sistema osteomuscular'),
  ('G43', 'Migraña', 'Enfermedades del sistema nervioso'),
  ('F41', 'Trastorno de ansiedad', 'Trastornos mentales'),
  ('J45', 'Asma', 'Enfermedades del sistema respiratorio'),
  ('J06.9', 'Infección aguda de las vías respiratorias', 'Enfermedades del sistema respiratorio'),
  ('M54.5', 'Lumbago', 'Enfermedades del sistema osteomuscular'),
  ('K21.0', 'Enfermedad por reflujo gastroesofágico', 'Enfermedades del sistema digestivo'),
  ('N39.0', 'Infección de vías urinarias', 'Enfermedades del sistema genitourinario'),
  ('E78.5', 'Hiperlipidemia', 'Enfermedades endocrinas'),
  ('D64.9', 'Anemia', 'Enfermedades de la sangre'),
  ('F32', 'Episodio depresivo', 'Trastornos mentales'),
  ('L30.9', 'Dermatitis', 'Enfermedades de la piel'),
  ('H10.9', 'Conjuntivitis', 'Enfermedades del ojo'),
  ('S83.5', 'Esguince de rodilla', 'Lesiones'),
  ('R51', 'Fiebre', 'Síntomas generales'),
  ('R10.4', 'Dolor abdominal', 'Síntomas generales'),
  ('R05', 'Tos', 'Síntomas generales'),
  ('R42', 'Mareo', 'Síntomas generales'),
  ('Z00.0', 'Examen médico general', 'Factores que influyen en el estado de salud'),
  ('Z23', 'Vacunación', 'Factores que influyen en el estado de salud'),
  ('Z01.4', 'Examen ginecológico', 'Factores que influyen en el estado de salud'),
  ('Z01.2', 'Examen dental', 'Factores que influyen en el estado de salud')
ON CONFLICT (code) DO NOTHING;

-- Seed lab tests
INSERT INTO lab_tests (name, description, code, price, reference_ranges) VALUES
  ('Hemograma completo', 'Conteo sanguíneo completo', 'HEM001', 25.00, '{"hemoglobin": {"min": 12, "max": 16}, "hematocrit": {"min": 36, "max": 48}}'),
  ('Glucosa en ayunas', 'Nivel de glucosa', 'GLU001', 15.00, '{"glucose": {"min": 70, "max": 100}}'),
  ('Perfil lipídico', 'Colesterol y triglicéridos', 'LIP001', 35.00, '{"cholesterol": {"min": 0, "max": 200}, "triglycerides": {"min": 0, "max": 150}}'),
  ('Creatinina', 'Función renal', 'CRE001', 20.00, '{"creatinine": {"min": 0.6, "max": 1.2}}'),
  ('TSH', 'Función tiroidea', 'TSH001', 30.00, '{"tsh": {"min": 0.4, "max": 4.0}}'),
  ('Urocultivo', 'Cultivo de orina', 'URO001', 25.00, '{"bacteria": {"max": 10000}}'),
  ('Hemoglobina glicosilada', 'Control de diabetes', 'HBA001', 35.00, '{"hba1c": {"min": 4, "max": 5.6}}'),
  ('PCR', 'Proteína C reactiva', 'PCR001', 20.00, '{"pcr": {"min": 0, "max": 10}}'),
  ('Transaminasas', 'Función hepática', 'ALT001', 25.00, '{"alt": {"min": 7, "max": 56}, "ast": {"min": 10, "max": 40}}')
ON CONFLICT (code) DO NOTHING;
