-- ============================================================
-- SCHEMA COMPLETO — Clínica Salud Vital
-- Single source of truth (sin migrations)
-- ============================================================

-- ============================================================
-- 1. TENANTS (multi-tenancy)
-- ============================================================
CREATE TABLE IF NOT EXISTS tenants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  domain TEXT NOT NULL UNIQUE,
  locale TEXT DEFAULT 'es',
  timezone TEXT DEFAULT 'America/Santiago',
  config JSONB DEFAULT '{}',
  active BOOLEAN DEFAULT true,
  deleted_at TIMESTAMPTZ,
  deleted_by INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  password TEXT NOT NULL,
  name TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('superadmin', 'admin', 'doctor', 'lab_technician', 'patient', 'guest', 'user')),
  rut TEXT,
  phone TEXT,
  gender TEXT,
  active BOOLEAN DEFAULT true,
  blocked_until TIMESTAMPTZ,
  no_show_count INT DEFAULT 0,
  password_changed BOOLEAN DEFAULT false,
  totp_secret TEXT,
  totp_enabled BOOLEAN DEFAULT false,
  last_login_at TIMESTAMPTZ,
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  failed_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMPTZ,
  token_version INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  tenant_id TEXT NOT NULL DEFAULT 'default'
);

CREATE UNIQUE INDEX idx_users_tenant_email ON users (tenant_id, email);

ALTER TABLE tenants ADD CONSTRAINT fk_tenants_deleted_by
  FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL;

-- ============================================================
-- 2. DOCTORS
-- ============================================================
CREATE TABLE doctors (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  specialty TEXT NOT NULL,
  email TEXT,
  user_id INT UNIQUE,
  slot_duration INT DEFAULT 30,
  CONSTRAINT fk_doctor_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT check_slot_duration CHECK (slot_duration IN (15, 30, 45, 60)),
  tenant_id TEXT NOT NULL DEFAULT 'default'
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_doctors_tenant_email ON doctors (tenant_id, email);

-- ============================================================
-- 3. BOOKINGS
-- ============================================================
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
  CONSTRAINT check_future_date CHECK (date >= CURRENT_DATE - INTERVAL '1 day'),
  CONSTRAINT check_duration CHECK (duration > 0 AND duration <= 480),
  tenant_id TEXT NOT NULL DEFAULT 'default'
);

-- ============================================================
-- 4. AVAILABILITY & EXCEPTIONS
-- ============================================================
CREATE TABLE doctor_availability (
  id SERIAL PRIMARY KEY,
  doctor_id INT NOT NULL,
  day_of_week INT NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  CONSTRAINT fk_doctor_availability FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
  CONSTRAINT check_time_range CHECK (start_time < end_time),
  CONSTRAINT check_day_of_week_range CHECK (day_of_week >= 1 AND day_of_week <= 7),
  tenant_id TEXT NOT NULL DEFAULT 'default'
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
  ),
  tenant_id TEXT NOT NULL DEFAULT 'default'
);

-- ============================================================
-- 5. CLINICAL RECORDS
-- ============================================================
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
  updated_at TIMESTAMP DEFAULT NOW(),
  tenant_id TEXT NOT NULL DEFAULT 'default'
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
  created_at TIMESTAMP DEFAULT NOW(),
  tenant_id TEXT NOT NULL DEFAULT 'default'
);

CREATE TABLE IF NOT EXISTS cie10_catalog (
  id SERIAL PRIMARY KEY,
  code VARCHAR(10) UNIQUE NOT NULL,
  description VARCHAR(500) NOT NULL,
  category VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- 6. AUDIT LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50),
  resource_id INTEGER,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  hash VARCHAR(64),
  previous_hash VARCHAR(64),
  created_at TIMESTAMP DEFAULT NOW(),
  tenant_id TEXT NOT NULL DEFAULT 'default'
);

-- ============================================================
-- 7. BILLING
-- ============================================================
CREATE TABLE IF NOT EXISTS invoices (
  id SERIAL PRIMARY KEY,
  invoice_number VARCHAR(50) UNIQUE NOT NULL,
  patient_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  doctor_id INTEGER REFERENCES doctors(id) ON DELETE SET NULL,
  booking_id INTEGER REFERENCES bookings(id) ON DELETE SET NULL,
  concept VARCHAR(255) NOT NULL,
  description TEXT,
  amount NUMERIC(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  tax_amount NUMERIC(10, 2) DEFAULT 0,
  discount_amount NUMERIC(10, 2) DEFAULT 0,
  total_amount NUMERIC(10, 2) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled', 'refunded', 'overdue')),
  due_date DATE NOT NULL,
  issued_at TIMESTAMP DEFAULT NOW(),
  paid_at TIMESTAMP,
  payment_method VARCHAR(50),
  payment_reference VARCHAR(255),
  notes TEXT,
  payment_data JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  tenant_id TEXT NOT NULL DEFAULT 'default'
);

CREATE TABLE IF NOT EXISTS invoice_items (
  id SERIAL PRIMARY KEY,
  invoice_id INTEGER REFERENCES invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  quantity INTEGER DEFAULT 1,
  unit_price NUMERIC(10, 2),
  created_at TIMESTAMP DEFAULT NOW(),
  tenant_id TEXT NOT NULL DEFAULT 'default'
);

CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  invoice_id INTEGER REFERENCES invoices(id) ON DELETE CASCADE,
  amount NUMERIC(10, 2) NOT NULL,
  payment_method VARCHAR(50) NOT NULL,
  transaction_id VARCHAR(255),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  payment_date TIMESTAMP DEFAULT NOW(),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  tenant_id TEXT NOT NULL DEFAULT 'default'
);

CREATE TABLE IF NOT EXISTS insurance_claims (
  id SERIAL PRIMARY KEY,
  invoice_id INTEGER REFERENCES invoices(id) ON DELETE SET NULL,
  patient_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  insurance_provider VARCHAR(255) NOT NULL,
  policy_number VARCHAR(100) NOT NULL,
  claim_number VARCHAR(100),
  amount NUMERIC(10, 2) NOT NULL,
  approved_amount NUMERIC(10, 2),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'approved', 'rejected', 'partial', 'paid')),
  submitted_at TIMESTAMP,
  resolved_at TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  tenant_id TEXT NOT NULL DEFAULT 'default'
);

-- ============================================================
-- 8. LABORATORY
-- ============================================================
CREATE TABLE IF NOT EXISTS lab_tests (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  code VARCHAR(50),
  category VARCHAR(100),
  unit VARCHAR(50),
  reference_min NUMERIC(10, 2),
  reference_max NUMERIC(10, 2),
  price NUMERIC(10, 2) NOT NULL DEFAULT 0,
  reference_ranges JSONB,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  tenant_id TEXT NOT NULL DEFAULT 'default'
);
CREATE UNIQUE INDEX IF NOT EXISTS lab_tests_tenant_code_unique ON lab_tests (tenant_id, code);

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
  updated_at TIMESTAMP DEFAULT NOW(),
  tenant_id TEXT NOT NULL DEFAULT 'default'
);

CREATE TABLE IF NOT EXISTS lab_request_items (
  id SERIAL PRIMARY KEY,
  lab_request_id INTEGER REFERENCES lab_requests(id) ON DELETE CASCADE,
  lab_test_id INTEGER REFERENCES lab_tests(id) ON DELETE CASCADE,
  priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'urgent')),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  results JSONB,
  result_value TEXT,
  result_notes TEXT,
  notes TEXT,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  tenant_id TEXT NOT NULL DEFAULT 'default'
);

-- ============================================================
-- 9. AUTH / TOKENS
-- ============================================================
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked BOOLEAN DEFAULT false,
  token_version INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  tenant_id TEXT NOT NULL DEFAULT 'default'
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- 10. SPECIALTIES CATALOG
-- ============================================================
CREATE TABLE IF NOT EXISTS specialties (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  icon VARCHAR(10) DEFAULT '🔬',
  description TEXT DEFAULT '',
  department VARCHAR(255) DEFAULT '',
  procedures JSONB DEFAULT '[]'::jsonb,
  color VARCHAR(7) DEFAULT '#1976D2',
  created_at TIMESTAMP DEFAULT NOW(),
  tenant_id TEXT NOT NULL DEFAULT 'default'
);

ALTER TABLE specialties ADD CONSTRAINT specialties_tenant_name_key UNIQUE (tenant_id, name);

-- ============================================================
-- 11. SAAS PLANS & SUBSCRIPTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS plans (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  price_monthly DECIMAL(10,2) NOT NULL DEFAULT 0,
  price_yearly DECIMAL(10,2) NOT NULL DEFAULT 0,
  max_doctors INTEGER NOT NULL DEFAULT 1,
  max_patients INTEGER NOT NULL DEFAULT 50,
  storage_gb INTEGER NOT NULL DEFAULT 1,
  features JSONB NOT NULL DEFAULT '{}',
  active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  plan_id INTEGER NOT NULL REFERENCES plans(id) ON DELETE RESTRICT,
  status VARCHAR(20) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'trialing', 'past_due', 'canceled', 'incomplete')),
  current_period_start TIMESTAMP NOT NULL DEFAULT NOW(),
  current_period_end TIMESTAMP NOT NULL,
  trial_end TIMESTAMP,
  canceled_at TIMESTAMP,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  stripe_price_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subscription_invoices (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  subscription_id INTEGER NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'uncollectible', 'void')),
  period_start TIMESTAMP NOT NULL,
  period_end TIMESTAMP NOT NULL,
  stripe_invoice_id TEXT UNIQUE,
  stripe_payment_intent TEXT,
  paid_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tenant_features (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  feature_key VARCHAR(100) NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, feature_key)
);

CREATE TABLE IF NOT EXISTS tenant_usage (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  metric_key VARCHAR(100) NOT NULL,
  metric_value BIGINT NOT NULL DEFAULT 0,
  recorded_at DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, metric_key, recorded_at)
);

-- ============================================================
-- 12. MIGRATION TRACKING
-- ============================================================
CREATE TABLE IF NOT EXISTS _migrations (
  name TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_bookings_doctor_date ON bookings(doctor_id, date);
CREATE INDEX IF NOT EXISTS idx_bookings_guest_rut ON bookings(guest_rut);
CREATE INDEX IF NOT EXISTS idx_bookings_user_date_status ON bookings(user_id, date, status);
CREATE INDEX IF NOT EXISTS idx_bookings_doctor_date_status ON bookings(doctor_id, date, status);
CREATE INDEX IF NOT EXISTS idx_bookings_doctor_date_time ON bookings(doctor_id, date, time);
CREATE INDEX IF NOT EXISTS idx_bookings_doctor_date_active ON bookings(doctor_id, date) WHERE status != 'cancelled';
CREATE INDEX IF NOT EXISTS idx_bookings_overlap ON bookings(doctor_id, date, time, status) WHERE status NOT IN ('cancelled');
CREATE INDEX IF NOT EXISTS idx_bookings_tenant ON bookings(tenant_id, doctor_id, date);
CREATE INDEX IF NOT EXISTS idx_bookings_tenant_date ON bookings(tenant_id, date DESC) WHERE status != 'cancelled';
CREATE INDEX IF NOT EXISTS idx_bookings_tenant_doctor_date_active ON bookings(tenant_id, doctor_id, date) WHERE status != 'cancelled';
CREATE INDEX IF NOT EXISTS idx_bookings_tenant_date_status ON bookings(tenant_id, date, status);

CREATE INDEX IF NOT EXISTS idx_availability_doctor_day ON doctor_availability(doctor_id, day_of_week, tenant_id);
CREATE INDEX IF NOT EXISTS idx_exceptions_doctor_date ON doctor_exceptions(doctor_id, date, tenant_id);

CREATE INDEX IF NOT EXISTS idx_users_rut ON users(rut);
CREATE INDEX IF NOT EXISTS idx_users_rut_clean_lookup ON users(REPLACE(rut, '.', ''), tenant_id) WHERE rut IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_email_tenant ON users(email, tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_tenant_email ON users(tenant_id, email);
CREATE INDEX IF NOT EXISTS idx_users_role_tenant ON users(role, tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id, id);

CREATE INDEX IF NOT EXISTS idx_doctors_tenant ON doctors(tenant_id, id);
CREATE INDEX IF NOT EXISTS idx_doctors_specialty ON doctors(specialty);

CREATE INDEX IF NOT EXISTS idx_clinical_records_patient_tenant ON clinical_records(patient_id, tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_clinical_records_doctor_tenant ON clinical_records(doctor_id, tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_prescriptions_record ON prescriptions(clinical_record_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_created ON audit_logs(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);

CREATE INDEX IF NOT EXISTS idx_invoices_patient_tenant ON invoices(patient_id, tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_tenant ON payments(tenant_id, invoice_id);
CREATE INDEX IF NOT EXISTS idx_insurance_claims_tenant ON insurance_claims(tenant_id, patient_id);
CREATE INDEX IF NOT EXISTS idx_lab_requests_tenant ON lab_requests(tenant_id, patient_id);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token_active ON refresh_tokens(token, revoked, expires_at) WHERE revoked = false;
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_active ON password_reset_tokens(token) WHERE used = false;

CREATE INDEX IF NOT EXISTS idx_plans_active ON plans(active) WHERE active = true;
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_unique_active ON subscriptions(tenant_id) WHERE status IN ('active', 'trialing');
CREATE INDEX IF NOT EXISTS idx_subscription_invoices_tenant ON subscription_invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_subscription_invoices_sub ON subscription_invoices(subscription_id);
CREATE INDEX IF NOT EXISTS idx_tenant_features_tenant ON tenant_features(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_usage_tenant ON tenant_usage(tenant_id, recorded_at);

CREATE INDEX IF NOT EXISTS idx_tenants_domain ON tenants(domain);

-- ============================================================
-- TRIGGERS (updated_at)
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

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

DROP TRIGGER IF EXISTS update_lab_tests_updated_at ON lab_tests;
CREATE TRIGGER update_lab_tests_updated_at
  BEFORE UPDATE ON lab_tests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_tenants_updated_at ON tenants;
CREATE TRIGGER set_tenants_updated_at
  BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_plans_updated_at ON plans;
CREATE TRIGGER update_plans_updated_at
  BEFORE UPDATE ON plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- SEED DATA
-- ============================================================

-- CIE-10 catalog
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

-- Lab tests
INSERT INTO lab_tests (name, description, code, price, reference_ranges, tenant_id) VALUES
  ('Hemograma completo', 'Conteo sanguíneo completo', 'HEM001', 25.00, '{"hemoglobin": {"min": 12, "max": 16}, "hematocrit": {"min": 36, "max": 48}}', 'default'),
  ('Glucosa en ayunas', 'Nivel de glucosa', 'GLU001', 15.00, '{"glucose": {"min": 70, "max": 100}}', 'default'),
  ('Perfil lipídico', 'Colesterol y triglicéridos', 'LIP001', 35.00, '{"cholesterol": {"min": 0, "max": 200}, "triglycerides": {"min": 0, "max": 150}}', 'default'),
  ('Creatinina', 'Función renal', 'CRE001', 20.00, '{"creatinine": {"min": 0.6, "max": 1.2}}', 'default'),
  ('TSH', 'Función tiroidea', 'TSH001', 30.00, '{"tsh": {"min": 0.4, "max": 4.0}}', 'default'),
  ('Urocultivo', 'Cultivo de orina', 'URO001', 25.00, '{"bacteria": {"max": 10000}}', 'default'),
  ('Hemoglobina glicosilada', 'Control de diabetes', 'HBA001', 35.00, '{"hba1c": {"min": 4, "max": 5.6}}', 'default'),
  ('PCR', 'Proteína C reactiva', 'PCR001', 20.00, '{"pcr": {"min": 0, "max": 10}}', 'default'),
  ('Transaminasas', 'Función hepática', 'ALT001', 25.00, '{"alt": {"min": 7, "max": 56}, "ast": {"min": 10, "max": 40}}', 'default')
ON CONFLICT (tenant_id, code) DO NOTHING;

-- Specialties
INSERT INTO specialties (name, icon, description, department, procedures, color) VALUES
  ('Cardiología', '❤️', 'Diagnóstico y tratamiento de enfermedades del corazón y sistema circulatorio', 'Departamento de Cardiología', '["Electrocardiograma", "Ecocardiograma", "Prueba de Esfuerzo", "Holter 24h", "Cateterismo", "Control de Hipertensión"]'::jsonb, '#ef4444'),
  ('Dermatología', '🧴', 'Cuidado de la piel, diagnóstico de enfermedades cutáneas y tratamientos estéticos', 'Departamento de Dermatología', '["Dermatoscopia", "Biopsia de Piel", "Tratamiento de Acné", "Cirugía de Lunares", "Crioterapia", "Terapia Láser"]'::jsonb, '#f59e0b'),
  ('Neurología', '🧠', 'Estudio y tratamiento de trastornos del sistema nervioso central y periférico', 'Departamento de Neurología', '["Electroencefalograma", "Resonancia Magnética", "Potenciales Evocados", "Tratamiento de Migraña", "Manejo de Epilepsia", "Neurorehabilitación"]'::jsonb, '#8b5cf6'),
  ('Pediatría', '👶', 'Atención médica integral para niños, adolescentes y control de su desarrollo', 'Departamento de Pediatría', '["Control de Salud Infantil", "Vacunación", "Control de Crecimiento", "Enfermedades Infecciosas", "Alergias Pediátricas", "Nutrición Infantil"]'::jsonb, '#06b6d4'),
  ('Medicina General', '🩺', 'Atención primaria, prevención y diagnóstico de enfermedades comunes', 'Departamento de Medicina General', '["Chequeo General", "Análisis Clínicos", "Control de Presión Arterial", "Vacunación", "Certificados Médicos", "Consejería Preventiva"]'::jsonb, '#10b981'),
  ('Ginecología', '🌸', 'Salud femenina, estudios ginecológicos y acompañamiento en el embarazo', 'Departamento de Ginecología', '["Papanicolaou", "Ecografía Ginecológica", "Colposcopía", "Control de Embarazo", "Evaluación de Fertilidad", "Cirugía Ginecológica"]'::jsonb, '#ec4899'),
  ('Traumatología', '🦴', 'Lesiones del sistema musculoesquelético, fracturas y cirugía ortopédica', 'Departamento de Traumatología', '["Radiografías", "Resonancia Musculoesquelética", "Reducción de Fracturas", "Artroscopia", "Prótesis Articular", "Rehabilitación"]'::jsonb, '#f97316'),
  ('Oftalmología', '👁️', 'Diagnóstico y tratamiento de enfermedades visuales y cirugía ocular', 'Departamento de Oftalmología', '["Examen de Agudeza Visual", "Fondo de Ojo", "Cirugía de Cataratas", "Tratamiento de Glaucoma", "Cirugía Láser", "Estrabismo"]'::jsonb, '#3b82f6'),
  ('Psiquiatría', '💭', 'Diagnóstico y tratamiento de trastornos de salud mental y emocional', 'Departamento de Psiquiatría', '["Evaluación Psiquiátrica", "Terapia Cognitivo-Conductual", "Manejo de Ansiedad", "Tratamiento de Depresión", "Trastorno Bipolar", "Terapia de Pareja"]'::jsonb, '#a855f7'),
  ('Endocrinología', '⚖️', 'Trastornos hormonales, metabolismo y enfermedades de las glándulas', 'Departamento de Endocrinología', '["Perfil Hormonal", "Control de Diabetes", "Prueba de Tiroides", "Estudio de Metabolismo", "Osteoporosis", "Trastornos Suprarrenales"]'::jsonb, '#14b8a6'),
  ('Urología', '🫀', 'Enfermedades del sistema urinario y salud reproductiva masculina', 'Departamento de Urología', '["Uroflujometría", "Ecografía Renal", "Cistoscopia", "Cirugía Prostática", "Infertilidad Masculina", "Infecciones Urinarias"]'::jsonb, '#0ea5e9'),
  ('Reumatología', '🦋', 'Enfermedades autoinmunes e inflamatorias del sistema musculoesquelético', 'Departamento de Reumatología', '["Perfil Reumatológico", "Artritis Reumatoide", "Lupus Eritematoso", "Osteoporosis", "Gota", "Espondilitis Anquilosante"]'::jsonb, '#e11d48')
ON CONFLICT (tenant_id, name) DO NOTHING;

-- SaaS plans
INSERT INTO plans (name, code, description, price_monthly, price_yearly, max_doctors, max_patients, storage_gb, features, sort_order) VALUES
  ('Gratuito', 'free', 'Plan básico para clínicas pequeñas', 0, 0, 1, 50, 1,
   '{"bookings": true, "clinical_records": false, "laboratory": false, "analytics": false, "api_access": false, "white_label": false, "custom_domain": false, "sms": false, "advanced_reports": false}'::jsonb, 1),
  ('Básico', 'basic', 'Para clínicas en crecimiento', 29, 290, 3, 200, 5,
   '{"bookings": true, "clinical_records": true, "laboratory": false, "analytics": true, "api_access": false, "white_label": false, "custom_domain": false, "sms": true, "advanced_reports": false}'::jsonb, 2),
  ('Profesional', 'pro', 'Solución completa para clínicas', 79, 790, 10, -1, 20,
   '{"bookings": true, "clinical_records": true, "laboratory": true, "analytics": true, "api_access": true, "white_label": false, "custom_domain": false, "sms": true, "advanced_reports": true}'::jsonb, 3),
  ('Enterprise', 'enterprise', 'Solución integral con personalización', 199, 1990, -1, -1, 100,
   '{"bookings": true, "clinical_records": true, "laboratory": true, "analytics": true, "api_access": true, "white_label": true, "custom_domain": true, "sms": true, "advanced_reports": true}'::jsonb, 4)
ON CONFLICT (code) DO NOTHING;
