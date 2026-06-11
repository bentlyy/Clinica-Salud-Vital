-- Tenants table for multi-tenancy
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
  role TEXT DEFAULT 'user' CHECK (role IN ('superadmin', 'admin', 'doctor', 'patient', 'guest', 'user')),
  rut TEXT,
  phone TEXT,
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

-- Add FK for tenants.deleted_by (created before users)
ALTER TABLE tenants ADD CONSTRAINT fk_tenants_deleted_by
  FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL;

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

-- Audit Logs
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

-- Billing Module
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

-- Laboratory Module
CREATE TABLE IF NOT EXISTS lab_tests (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  code VARCHAR(50) UNIQUE,
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

-- RBAC Module
CREATE TABLE IF NOT EXISTS permissions (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  description VARCHAR(255),
  resource VARCHAR(50) NOT NULL,
  action VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  tenant_id TEXT NOT NULL DEFAULT 'default'
);

CREATE TABLE IF NOT EXISTS role_permissions (
  id SERIAL PRIMARY KEY,
  role VARCHAR(50) NOT NULL,
  permission_id INTEGER REFERENCES permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(role, permission_id),
  tenant_id TEXT NOT NULL DEFAULT 'default'
);

CREATE TABLE IF NOT EXISTS user_permissions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  permission_id INTEGER REFERENCES permissions(id) ON DELETE CASCADE,
  granted BOOLEAN DEFAULT true,
  granted_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  UNIQUE(user_id, permission_id),
  tenant_id TEXT NOT NULL DEFAULT 'default'
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
  error_message TEXT,
  tenant_id TEXT NOT NULL DEFAULT 'default'
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
  error_message TEXT,
  tenant_id TEXT NOT NULL DEFAULT 'default'
);

CREATE TABLE IF NOT EXISTS ml_demand_forecast (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL,
  predicted_demand INT NOT NULL,
  actual_demand INT,
  confidence TEXT,
  generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  model_version TEXT DEFAULT 'v1',
  tenant_id TEXT NOT NULL DEFAULT 'default'
);

-- Indexes (selective: no GIN, no low-cardinality status, no UNIQUE-duplicates)
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

CREATE INDEX IF NOT EXISTS idx_user_permissions_user ON user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_permissions_resource_action ON permissions(resource, action);

CREATE INDEX IF NOT EXISTS idx_ml_predictions_tenant_model ON ml_prediction_history(tenant_id, model_type, prediction_date DESC);

CREATE INDEX IF NOT EXISTS idx_tenants_domain ON tenants(domain);

-- Function for updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers
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

-- Seed permissions (columns resource, action added by migration 005)
INSERT INTO permissions (name, description, resource, action) VALUES
  ('bookings:create', 'Crear reservas', 'booking', 'create'),
  ('bookings:read', 'Ver reservas', 'booking', 'read'),
  ('bookings:update', 'Actualizar reservas', 'booking', 'update'),
  ('bookings:delete', 'Eliminar reservas', 'booking', 'delete'),
  ('patients:read', 'Ver pacientes', 'patient', 'read'),
  ('patients:create', 'Crear pacientes', 'patient', 'create'),
  ('patients:update', 'Actualizar pacientes', 'patient', 'update'),
  ('clinical:read', 'Ver historiales clínicos', 'clinical_record', 'read'),
  ('clinical:create', 'Crear historiales clínicos', 'clinical_record', 'create'),
  ('clinical:update', 'Actualizar historiales clínicos', 'clinical_record', 'update')
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

-- ============================================================
-- TABLES CREADAS POR MIGRACIONES (007-042)
-- ============================================================

-- Migration tracking table
CREATE TABLE IF NOT EXISTS _migrations (
  name TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ DEFAULT NOW()
);

-- 007: Refresh tokens for JWT refresh flow
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  tenant_id TEXT NOT NULL DEFAULT 'default'
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token_active ON refresh_tokens(token, revoked, expires_at) WHERE revoked = false;

-- 007: Notification preferences per user/channel
CREATE TABLE IF NOT EXISTS notification_preferences (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  channel VARCHAR(20) NOT NULL DEFAULT 'email',
  reminder_24h BOOLEAN DEFAULT true,
  reminder_1h BOOLEAN DEFAULT true,
  confirmation BOOLEAN DEFAULT true,
  lab_results BOOLEAN DEFAULT true,
  billing BOOLEAN DEFAULT true,
  UNIQUE(user_id, channel)
);

CREATE INDEX IF NOT EXISTS idx_notification_preferences_tenant ON notification_preferences(tenant_id, user_id);

-- 007a: Specialties catalog (tenant-scoped)
CREATE TABLE IF NOT EXISTS specialties (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  tenant_id TEXT NOT NULL DEFAULT 'default'
);

ALTER TABLE specialties ADD CONSTRAINT specialties_tenant_name_key UNIQUE (tenant_id, name);

-- 010: SaaS plans
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

CREATE INDEX IF NOT EXISTS idx_plans_active ON plans(active) WHERE active = true;

-- 010: Subscriptions per tenant
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

CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_unique_active ON subscriptions(tenant_id) WHERE status IN ('active', 'trialing');

-- 010: Subscription invoices (SaaS billing)
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

CREATE INDEX IF NOT EXISTS idx_subscription_invoices_tenant ON subscription_invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_subscription_invoices_sub ON subscription_invoices(subscription_id);

-- 010: Tenant feature flags
CREATE TABLE IF NOT EXISTS tenant_features (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  feature_key VARCHAR(100) NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, feature_key)
);

CREATE INDEX IF NOT EXISTS idx_tenant_features_tenant ON tenant_features(tenant_id);

-- 010: Usage metering per tenant
CREATE TABLE IF NOT EXISTS tenant_usage (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  metric_key VARCHAR(100) NOT NULL,
  metric_value BIGINT NOT NULL DEFAULT 0,
  recorded_at DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, metric_key, recorded_at)
);

CREATE INDEX IF NOT EXISTS idx_tenant_usage_tenant ON tenant_usage(tenant_id, recorded_at);

-- 020: ML experiment tracking
CREATE TABLE IF NOT EXISTS ml_experiments (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ml_experiments_tenant ON ml_experiments(tenant_id);

CREATE TABLE IF NOT EXISTS ml_runs (
  id SERIAL PRIMARY KEY,
  experiment_id INTEGER REFERENCES ml_experiments(id) ON DELETE CASCADE,
  run_name VARCHAR(255),
  model_type VARCHAR(100) NOT NULL,
  status VARCHAR(50) DEFAULT 'running',
  tenant_id TEXT NOT NULL DEFAULT 'default',
  source_version VARCHAR(100),
  start_time TIMESTAMPTZ DEFAULT NOW(),
  end_time TIMESTAMPTZ,
  duration_ms INTEGER,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ml_runs_experiment ON ml_runs(experiment_id);
CREATE INDEX IF NOT EXISTS idx_ml_runs_tenant ON ml_runs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ml_runs_model_type ON ml_runs(model_type);

CREATE TABLE IF NOT EXISTS ml_run_params (
  id SERIAL PRIMARY KEY,
  run_id INTEGER NOT NULL REFERENCES ml_runs(id) ON DELETE CASCADE,
  param_key VARCHAR(255) NOT NULL,
  param_value TEXT NOT NULL,
  param_type VARCHAR(50) DEFAULT 'string',
  tenant_id TEXT NOT NULL DEFAULT 'default',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ml_run_params_run ON ml_run_params(run_id);
CREATE INDEX IF NOT EXISTS idx_ml_run_params_tenant ON ml_run_params(tenant_id);

CREATE TABLE IF NOT EXISTS ml_run_metrics (
  id SERIAL PRIMARY KEY,
  run_id INTEGER NOT NULL REFERENCES ml_runs(id) ON DELETE CASCADE,
  metric_key VARCHAR(255) NOT NULL,
  metric_value DOUBLE PRECISION NOT NULL,
  step INTEGER DEFAULT 0,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ml_run_metrics_run ON ml_run_metrics(run_id);
CREATE INDEX IF NOT EXISTS idx_ml_run_metrics_tenant ON ml_run_metrics(tenant_id);

CREATE TABLE IF NOT EXISTS ml_run_artifacts (
  id SERIAL PRIMARY KEY,
  run_id INTEGER NOT NULL REFERENCES ml_runs(id) ON DELETE CASCADE,
  artifact_name VARCHAR(255) NOT NULL,
  artifact_type VARCHAR(100),
  artifact_data JSONB,
  file_path TEXT,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ml_run_artifacts_run ON ml_run_artifacts(run_id);
CREATE INDEX IF NOT EXISTS idx_ml_run_artifacts_tenant ON ml_run_artifacts(tenant_id);

-- 022: Password reset tokens
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_active ON password_reset_tokens(token) WHERE used = false;

-- 024: RLS audit tracking
CREATE TABLE IF NOT EXISTS _rls_audit (
  id SERIAL PRIMARY KEY,
  table_name TEXT NOT NULL,
  rls_enabled BOOLEAN NOT NULL,
  rls_forced BOOLEAN NOT NULL,
  policy_count INTEGER NOT NULL,
  checked_at TIMESTAMPTZ DEFAULT NOW()
);

-- 027: GDPR/HIPAA compliance tables
CREATE TABLE IF NOT EXISTS user_consents (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  consent_type VARCHAR(100) NOT NULL,
  granted BOOLEAN NOT NULL DEFAULT false,
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  ip_address INET,
  user_agent TEXT,
  UNIQUE (user_id, tenant_id, consent_type)
);

CREATE INDEX IF NOT EXISTS idx_user_consents_user ON user_consents(user_id, tenant_id);

CREATE TABLE IF NOT EXISTS data_retention_policy (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  entity_type VARCHAR(100) NOT NULL,
  retention_days INTEGER NOT NULL,
  action VARCHAR(20) DEFAULT 'anonymize' CHECK (action IN ('anonymize', 'delete')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS phi_access_log (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  tenant_id TEXT NOT NULL DEFAULT 'default',
  action VARCHAR(50) NOT NULL,
  entity_type VARCHAR(100) NOT NULL,
  entity_id INTEGER,
  accessed_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,
  duration_ms INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_phi_access_log_tenant ON phi_access_log(tenant_id, accessed_at DESC);

CREATE TABLE IF NOT EXISTS encryption_keys (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  key_identifier VARCHAR(64) UNIQUE NOT NULL,
  key_data_encrypted TEXT NOT NULL,
  algorithm VARCHAR(50) DEFAULT 'aes-256-gcm',
  key_version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  rotated_at TIMESTAMPTZ,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'rotated', 'compromised', 'retired'))
);

CREATE INDEX IF NOT EXISTS idx_encryption_keys_tenant_active ON encryption_keys(tenant_id, status) WHERE status = 'active';

-- 032: Clinical record versioning
CREATE TABLE IF NOT EXISTS clinical_record_versions (
  id SERIAL PRIMARY KEY,
  clinical_record_id INTEGER NOT NULL REFERENCES clinical_records(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  version INTEGER NOT NULL,
  snapshot JSONB NOT NULL,
  changed_by INTEGER REFERENCES users(id),
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  change_reason VARCHAR(255),
  UNIQUE (clinical_record_id, version)
);

CREATE INDEX IF NOT EXISTS idx_cr_versions_record ON clinical_record_versions(clinical_record_id, version DESC);
CREATE INDEX IF NOT EXISTS idx_cr_versions_tenant ON clinical_record_versions(tenant_id, changed_at DESC);

-- 033: Idempotency keys for billing
CREATE TABLE IF NOT EXISTS idempotency_keys (
  id SERIAL PRIMARY KEY,
  key VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_idempotency_keys_expires ON idempotency_keys(expires_at);

-- 042: Query performance monitoring
CREATE TABLE IF NOT EXISTS slow_query_log (
  id SERIAL PRIMARY KEY,
  query_hash TEXT NOT NULL,
  query_text TEXT NOT NULL,
  duration_ms INTEGER NOT NULL,
  tenant_id TEXT,
  endpoint TEXT,
  occurred_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_slow_query_hash ON slow_query_log(query_hash);
CREATE INDEX IF NOT EXISTS idx_slow_query_duration ON slow_query_log(duration_ms DESC);

CREATE TABLE IF NOT EXISTS table_size_snapshot (
  id SERIAL PRIMARY KEY,
  table_name TEXT NOT NULL,
  row_count BIGINT,
  total_size_bytes BIGINT,
  snapshot_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- ADDITIONAL TRIGGERS AND FUNCTIONS (migrations 007-049)
-- ============================================================

-- Plans trigger
DROP TRIGGER IF EXISTS update_plans_updated_at ON plans;
CREATE TRIGGER update_plans_updated_at
  BEFORE UPDATE ON plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Subscriptions trigger
DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Clinical record versioning trigger
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

DROP TRIGGER IF EXISTS trg_clinical_record_version ON clinical_records;
CREATE TRIGGER trg_clinical_record_version
  BEFORE UPDATE ON clinical_records
  FOR EACH ROW
  EXECUTE FUNCTION fn_snapshot_clinical_record('auto_version');

-- Tenant ID enforcement trigger (migration 024)
CREATE OR REPLACE FUNCTION enforce_tenant_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tenant_id IS NULL OR NEW.tenant_id = '' THEN
    NEW.tenant_id := NULLIF(current_setting('app.tenant_id', true), '');
    IF NEW.tenant_id IS NULL OR NEW.tenant_id = '' THEN
      RAISE EXCEPTION 'tenant_id es OBLIGATORIO. Debes ejecutar: SET SESSION app.tenant_id = ''<tenant_id>'' antes de insertar.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply enforce_tenant_id trigger to critical tables
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'users', 'doctors', 'bookings', 'clinical_records', 'invoices',
      'lab_requests', 'audit_logs', 'ml_prediction_history',
      'subscriptions', 'refresh_tokens'
    ])
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_enforce_tenant_id ON %I', tbl);
    EXECUTE format(
      'CREATE TRIGGER trg_enforce_tenant_id BEFORE INSERT ON %I
       FOR EACH ROW EXECUTE FUNCTION enforce_tenant_id()',
      tbl
    );
  END LOOP;
END $$;

-- ============================================================
-- SEED DATA FOR NEW TABLES
-- ============================================================

-- Seed specialties (007a)
INSERT INTO specialties (name) VALUES
  ('Cardiología'),
  ('Dermatología'),
  ('Neurología'),
  ('Pediatría'),
  ('Medicina General'),
  ('Ginecología'),
  ('Traumatología'),
  ('Oftalmología'),
  ('Psiquiatría'),
  ('Endocrinología'),
  ('Urología'),
  ('Reumatología')
ON CONFLICT (tenant_id, name) DO NOTHING;

-- Seed plans (010)
INSERT INTO plans (name, code, description, price_monthly, price_yearly, max_doctors, max_patients, storage_gb, features, sort_order) VALUES
  ('Gratuito', 'free', 'Plan básico para clínicas pequeñas', 0, 0, 1, 50, 1,
   '{"bookings": true, "clinical_records": false, "laboratory": false, "analytics": false, "ml": false, "ml_predictions_limit": 0, "ml_training_limit": 0, "api_access": false, "white_label": false, "custom_domain": false, "sms": false, "advanced_reports": false}'::jsonb, 1),
  ('Básico', 'basic', 'Para clínicas en crecimiento', 29, 290, 3, 200, 5,
   '{"bookings": true, "clinical_records": true, "laboratory": false, "analytics": true, "ml": false, "ml_predictions_limit": 0, "ml_training_limit": 0, "api_access": false, "white_label": false, "custom_domain": false, "sms": true, "advanced_reports": false}'::jsonb, 2),
  ('Profesional', 'pro', 'Solución completa para clínicas', 79, 790, 10, -1, 20,
   '{"bookings": true, "clinical_records": true, "laboratory": true, "analytics": true, "ml": true, "ml_predictions_limit": 1000, "ml_training_limit": 1, "api_access": true, "white_label": false, "custom_domain": false, "sms": true, "advanced_reports": true}'::jsonb, 3),
  ('Enterprise', 'enterprise', 'Solución integral con personalización', 199, 1990, -1, -1, 100,
   '{"bookings": true, "clinical_records": true, "laboratory": true, "analytics": true, "ml": true, "ml_predictions_limit": 10000, "ml_training_limit": 10, "api_access": true, "white_label": true, "custom_domain": true, "sms": true, "advanced_reports": true}'::jsonb, 4)
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- ROW LEVEL SECURITY (migrations 019-046)
-- ============================================================

-- Enable RLS on all tenant-scoped tables
DO $$
DECLARE
  tbl TEXT;
  tables TEXT[] := ARRAY[
    'users', 'doctors', 'bookings', 'doctor_availability', 'doctor_exceptions',
    'clinical_records', 'prescriptions', 'audit_logs',
    'invoices', 'invoice_items', 'payments', 'insurance_claims',
    'lab_tests', 'lab_requests', 'lab_request_items',
    'permissions', 'role_permissions', 'user_permissions',
    'ml_prediction_history', 'ml_model_metrics', 'ml_demand_forecast',
    'ml_experiments', 'ml_runs', 'ml_run_params', 'ml_run_metrics', 'ml_run_artifacts',
    'refresh_tokens', 'notification_preferences',
    'password_reset_tokens',
    'subscriptions', 'subscription_invoices', 'tenant_features', 'tenant_usage',
    'user_consents', 'data_retention_policy', 'phi_access_log', 'encryption_keys',
    'clinical_record_versions', 'specialties'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    IF EXISTS (SELECT 1 FROM pg_class WHERE relname = tbl AND relkind = 'r') THEN
      EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
      EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', tbl);
      EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', tbl);
      EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_policy ON %I', tbl);
      EXECUTE format('DROP POLICY IF EXISTS superadmin_bypass ON %I', tbl);
      EXECUTE format('DROP POLICY IF EXISTS superadmin_access ON %I', tbl);
      EXECUTE format(
        'CREATE POLICY tenant_isolation_policy ON %I FOR ALL
         USING (
           COALESCE(NULLIF(current_setting(''app.tenant_id'', true), ''''), ''NOT_SET'') = tenant_id
         )
         WITH CHECK (
           COALESCE(NULLIF(current_setting(''app.tenant_id'', true), ''''), ''NOT_SET'') = tenant_id
         )',
        tbl
      );
      EXECUTE format(
        'CREATE POLICY superadmin_bypass ON %I FOR ALL
         USING (
           current_setting(''app.user_role'', true) = ''superadmin''
         )',
        tbl
      );
    END IF;
  END LOOP;
END $$;
