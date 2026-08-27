-- ============================================================
-- SCHEMA COMPLETO — Vitaria
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
  tenant_id TEXT DEFAULT 'default'
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
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed', 'no_show')),
  confirmed BOOLEAN DEFAULT FALSE,
  confirmation_token TEXT UNIQUE,
  guest_rut TEXT,
  guest_name TEXT,
  guest_email TEXT,
  guest_phone TEXT,
  reminder_1h_sent BOOLEAN DEFAULT FALSE,
  reminder_24h_sent BOOLEAN DEFAULT FALSE,
  series_id INT,
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
  tenant_id TEXT NOT NULL DEFAULT 'default',
  active BOOLEAN DEFAULT true
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
CREATE TABLE IF NOT EXISTS lab_areas (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  icon VARCHAR(10),
  color VARCHAR(7),
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

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
  lab_area_id INTEGER REFERENCES lab_areas(id) ON DELETE SET NULL,
  result_type VARCHAR(20) DEFAULT 'numeric' CHECK (result_type IN ('numeric', 'text', 'select', 'multiselect', 'graph', 'image')),
  result_options JSONB,
  decimals INTEGER DEFAULT 1,
  unit_alt VARCHAR(50),
  conversion_factor NUMERIC(10, 4),
  critical_min NUMERIC(10, 2),
  critical_max NUMERIC(10, 2),
  delta_check_pct NUMERIC(5, 2) DEFAULT 20,
  turnaround_time_min INTEGER,
  preparation_instructions TEXT,
  sample_type VARCHAR(50),
  container_type VARCHAR(50),
  volume_ml NUMERIC(10, 2),
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
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'received', 'verified', 'assigned', 'processing', 'qc_review', 'result_entered', 'validated_tech', 'validated_doctor', 'signed', 'delivered', 'cancelled', 'rejected', 'repeated')),
  notes TEXT,
  requested_at TIMESTAMP DEFAULT NOW(),
  collected_at TIMESTAMP,
  completed_at TIMESTAMP,
  lab_type VARCHAR(10),
  lab_area_id INTEGER REFERENCES lab_areas(id) ON DELETE SET NULL,
  received_at TIMESTAMP,
  received_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  verified_at TIMESTAMP,
  verified_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  urgency_reason TEXT,
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
  lab_area_id INTEGER REFERENCES lab_areas(id) ON DELETE SET NULL,
  validated_by_tech INTEGER REFERENCES users(id) ON DELETE SET NULL,
  validated_at_tech TIMESTAMP,
  validated_by_doctor INTEGER REFERENCES users(id) ON DELETE SET NULL,
  validated_at_doctor TIMESTAMP,
  signed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  signed_at TIMESTAMP,
  delivered_at TIMESTAMP,
  delivery_method VARCHAR(50),
  is_critical BOOLEAN DEFAULT false,
  is_repeated BOOLEAN DEFAULT false,
  delta_check_status VARCHAR(20),
  previous_result_id INTEGER REFERENCES lab_request_items(id) ON DELETE SET NULL,
  assigned_tech_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  unit VARCHAR(50),
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
  session_id INT,
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
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  applied_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- 13. BOOKING SERIES (recurring bookings)
-- ============================================================
CREATE TABLE IF NOT EXISTS booking_series (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  doctor_id INTEGER NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  frequency VARCHAR(20) NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  interval_count INTEGER NOT NULL DEFAULT 1,
  start_date DATE NOT NULL,
  time TIME NOT NULL,
  duration INTEGER NOT NULL DEFAULT 30,
  occurrences INTEGER NOT NULL,
  created_count INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- 14. BOOKING STATUS HISTORY
-- ============================================================
CREATE TABLE IF NOT EXISTS booking_status_history (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  from_status VARCHAR(50),
  to_status VARCHAR(50) NOT NULL,
  actor_type VARCHAR(50) NOT NULL DEFAULT 'system',
  changed_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  changed_by_role VARCHAR(50),
  reason TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- 15. NOTIFICATIONS (in-app)
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'warning', 'success', 'error')),
  title VARCHAR(255) NOT NULL,
  message TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  link TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- 16. WAITLIST
-- ============================================================
CREATE TABLE IF NOT EXISTS waitlist (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  doctor_id INTEGER NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  requested_date DATE NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'notified', 'booked', 'removed')),
  notified_at TIMESTAMPTZ,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(doctor_id, user_id, requested_date)
);

-- ============================================================
-- 17. CLINIC HOLIDAYS
-- ============================================================
CREATE TABLE IF NOT EXISTS clinic_holidays (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  holiday_date DATE NOT NULL,
  name VARCHAR(255) NOT NULL,
  notice_days INTEGER NOT NULL DEFAULT 15,
  cancel_bookings BOOLEAN NOT NULL DEFAULT true,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, holiday_date)
);

-- ============================================================
-- 18. MEDICAL HISTORY
-- ============================================================
CREATE TABLE IF NOT EXISTS medical_history (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  patient_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  condition VARCHAR(255) NOT NULL,
  onset_date DATE,
  status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'chronic', 'family')),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- 19. USER SESSIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS user_sessions (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- 20. ATTACHMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS attachments (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  entity_type VARCHAR(50) NOT NULL,
  entity_id INTEGER NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  stored_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  size_bytes INTEGER NOT NULL,
  uploaded_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- 21. REPORTS
-- ============================================================
CREATE TABLE IF NOT EXISTS reports (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  type VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'generating' CHECK (status IN ('generating', 'completed', 'failed')),
  config JSONB NOT NULL DEFAULT '{}',
  result_url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- 22. WEBHOOKS
-- ============================================================
CREATE TABLE IF NOT EXISTS webhook_subscriptions (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  url TEXT NOT NULL,
  secret TEXT NOT NULL,
  events TEXT[] NOT NULL DEFAULT '{}',
  active BOOLEAN NOT NULL DEFAULT true,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  subscription_id INTEGER NOT NULL REFERENCES webhook_subscriptions(id) ON DELETE CASCADE,
  event VARCHAR(100) NOT NULL,
  payload JSONB,
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'delivered', 'failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  next_attempt_at TIMESTAMPTZ,
  response_status INTEGER,
  response_body TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- 23. LABORATORY EXTENDED TABLES
-- ============================================================
CREATE TABLE IF NOT EXISTS lab_samples (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  lab_request_item_id INTEGER REFERENCES lab_request_items(id) ON DELETE SET NULL,
  lab_request_id INTEGER REFERENCES lab_requests(id) ON DELETE CASCADE,
  sample_type VARCHAR(100) NOT NULL,
  sample_code VARCHAR(50) NOT NULL,
  container_type VARCHAR(100),
  volume DECIMAL(10,2),
  received_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  reception_time TIMESTAMPTZ DEFAULT NOW(),
  verification_time TIMESTAMPTZ,
  verified_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  assigned_tech_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  assigned_equipment_id INTEGER,
  qc_status VARCHAR(50),
  qc_notes TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'received', 'verified', 'assigned', 'processing', 'completed', 'rejected', 'disposed')),
  rejection_reason TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lab_qc_records (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  lab_test_id INTEGER REFERENCES lab_tests(id) ON DELETE SET NULL,
  lab_area_id INTEGER REFERENCES lab_areas(id) ON DELETE SET NULL,
  sample_id INTEGER REFERENCES lab_samples(id) ON DELETE SET NULL,
  equipment_id INTEGER,
  reagent_id INTEGER,
  qc_type VARCHAR(50) NOT NULL,
  control_name VARCHAR(255) NOT NULL,
  lot_number VARCHAR(100),
  expiration_date DATE,
  measured_value NUMERIC(10,4),
  expected_min NUMERIC(10,4),
  expected_max NUMERIC(10,4),
  status VARCHAR(50) NOT NULL CHECK (status IN ('passed', 'failed', 'warning', 'review')),
  performed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  notes TEXT,
  performed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lab_equipment (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  name VARCHAR(255) NOT NULL,
  model VARCHAR(255),
  serial_number VARCHAR(255),
  lab_area_id INTEGER REFERENCES lab_areas(id) ON DELETE SET NULL,
  connection_type VARCHAR(50) DEFAULT 'manual',
  ip_address VARCHAR(45),
  port INTEGER,
  status VARCHAR(50) DEFAULT 'online' CHECK (status IN ('online', 'offline', 'maintenance', 'calibration')),
  last_calibration TIMESTAMPTZ,
  next_calibration TIMESTAMPTZ,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lab_reagents (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  name VARCHAR(255) NOT NULL,
  catalog_number VARCHAR(100),
  lot_number VARCHAR(100),
  supplier VARCHAR(255),
  stock_quantity INTEGER DEFAULT 0,
  unit VARCHAR(50) DEFAULT 'u',
  min_stock INTEGER DEFAULT 0,
  current_stock INTEGER DEFAULT 0,
  expiration_date DATE,
  storage_conditions TEXT,
  lab_test_id INTEGER REFERENCES lab_tests(id) ON DELETE SET NULL,
  lab_area_id INTEGER REFERENCES lab_areas(id) ON DELETE SET NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lab_notifications (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  severity VARCHAR(20) DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
  lab_request_id INTEGER REFERENCES lab_requests(id) ON DELETE CASCADE,
  acknowledged BOOLEAN DEFAULT false,
  acknowledged_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lab_result_history (
  id SERIAL PRIMARY KEY,
  lab_request_item_id INTEGER REFERENCES lab_request_items(id) ON DELETE SET NULL,
  patient_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  lab_test_id INTEGER REFERENCES lab_tests(id) ON DELETE SET NULL,
  result_value TEXT,
  previous_result_value TEXT,
  delta_percentage DECIMAL(10, 2),
  delta_check_status VARCHAR(20) CHECK (delta_check_status IN ('normal', 'warning', 'critical')),
  checked_at TIMESTAMP DEFAULT NOW(),
  tenant_id TEXT NOT NULL DEFAULT 'default'
);

-- ============================================================
-- 24. JOBS (background task queue)
-- ============================================================
CREATE TABLE IF NOT EXISTS jobs (
  id            SERIAL PRIMARY KEY,
  type          VARCHAR(100)  NOT NULL,
  data          JSONB         NOT NULL DEFAULT '{}',
  status        VARCHAR(20)   NOT NULL DEFAULT 'pending',
  attempts      INTEGER       NOT NULL DEFAULT 0,
  max_attempts  INTEGER       NOT NULL DEFAULT 3,
  last_error    TEXT,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  started_at    TIMESTAMPTZ,
  completed_at  TIMESTAMPTZ,
  next_retry_at TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 25. ML DEMAND FORECAST (referenced in seed.ts)
-- ============================================================
CREATE TABLE IF NOT EXISTS ml_demand_forecast (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  date DATE NOT NULL,
  predicted_demand INTEGER,
  actual_demand INTEGER,
  confidence INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- 25. SUBSCRIPTION INVOICES (referenced in saas.service.ts)
-- ============================================================

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
CREATE INDEX IF NOT EXISTS idx_users_email_tenant ON users(email, tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_role_tenant ON users(role, tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id, id);

CREATE INDEX IF NOT EXISTS idx_doctors_tenant ON doctors(tenant_id, id);
CREATE INDEX IF NOT EXISTS idx_doctors_specialty ON doctors(specialty);

CREATE INDEX IF NOT EXISTS idx_clinical_records_patient_tenant ON clinical_records(patient_id, tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_clinical_records_doctor_tenant ON clinical_records(doctor_id, tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_prescriptions_record ON prescriptions(clinical_record_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_created ON audit_logs(tenant_id, created_at DESC);

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
-- NEW INDEXES (backend query optimization)
-- ============================================================

-- Notifications: filtered by tenant_id + user_id + is_read
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(tenant_id, user_id, is_read);

-- Waitlist: filtered by doctor_id + requested_date + tenant_id + status
CREATE INDEX IF NOT EXISTS idx_waitlist_doctor_date_status ON waitlist(doctor_id, requested_date, tenant_id, status);

-- Booking series: filtered by tenant_id + user_id or tenant_id + doctor_id
CREATE INDEX IF NOT EXISTS idx_booking_series_tenant_user ON booking_series(tenant_id, user_id);
CREATE INDEX IF NOT EXISTS idx_booking_series_tenant_doctor ON booking_series(tenant_id, doctor_id);

-- Booking status history: filtered by booking_id + to_status
CREATE INDEX IF NOT EXISTS idx_booking_status_history_booking_status ON booking_status_history(booking_id, to_status);

-- Lab request items: filtered by lab_request_id + tenant_id
CREATE INDEX IF NOT EXISTS idx_lab_request_items_request ON lab_request_items(lab_request_id, tenant_id);

-- Lab samples: filtered by tenant_id + reception_time
CREATE INDEX IF NOT EXISTS idx_lab_samples_tenant_time ON lab_samples(tenant_id, reception_time);

-- Attachments: filtered by tenant_id + entity_type + entity_id
CREATE INDEX IF NOT EXISTS idx_attachments_entity ON attachments(tenant_id, entity_type, entity_id);

-- User sessions: filtered by user_id + tenant_id + revoked_at
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_tenant ON user_sessions(user_id, tenant_id, revoked_at);

-- Clinic holidays: filtered by tenant_id + holiday_date
CREATE INDEX IF NOT EXISTS idx_clinic_holidays_tenant_date ON clinic_holidays(tenant_id, holiday_date);

-- Medical history: filtered by patient_id + tenant_id
CREATE INDEX IF NOT EXISTS idx_medical_history_patient_tenant ON medical_history(patient_id, tenant_id);

-- Reports: filtered by tenant_id + user_id
CREATE INDEX IF NOT EXISTS idx_reports_tenant_user ON reports(tenant_id, user_id);

-- Webhook subscriptions: filtered by tenant_id + active
CREATE INDEX IF NOT EXISTS idx_webhook_subscriptions_tenant_active ON webhook_subscriptions(tenant_id, active);

-- Webhook deliveries: filtered by subscription_id
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_subscription ON webhook_deliveries(subscription_id);

-- Lab QC records: filtered by tenant_id + lab_area_id
CREATE INDEX IF NOT EXISTS idx_lab_qc_records_tenant_area ON lab_qc_records(tenant_id, lab_area_id);

-- Lab equipment: filtered by tenant_id + lab_area_id
CREATE INDEX IF NOT EXISTS idx_lab_equipment_tenant_area ON lab_equipment(tenant_id, lab_area_id);

-- Lab reagents: filtered by tenant_id + lab_area_id
CREATE INDEX IF NOT EXISTS idx_lab_reagents_tenant_area ON lab_reagents(tenant_id, lab_area_id);

-- Lab notifications: filtered by tenant_id + acknowledged + severity
CREATE INDEX IF NOT EXISTS idx_lab_notifications_tenant_status ON lab_notifications(tenant_id, acknowledged, severity);

-- ML demand forecast: filtered by tenant_id + date
CREATE INDEX IF NOT EXISTS idx_ml_demand_forecast_tenant_date ON ml_demand_forecast(tenant_id, date);

-- Lab result history: filtered by patient_id + lab_test_id
CREATE INDEX IF NOT EXISTS idx_lab_result_history_patient ON lab_result_history(patient_id, lab_test_id);

-- Jobs: pending queue + type
CREATE INDEX IF NOT EXISTS idx_jobs_pending ON jobs (next_retry_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_jobs_type ON jobs (type);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs (status);

-- Lab samples: filtered by lab_request_id
CREATE INDEX IF NOT EXISTS idx_lab_samples_request ON lab_samples(lab_request_id);
CREATE INDEX IF NOT EXISTS idx_lab_samples_code ON lab_samples(sample_code);

-- Bookings: series_id (migration 019)
CREATE INDEX IF NOT EXISTS idx_bookings_series ON bookings(series_id);

-- Refresh tokens: session_id (migration 013)
CREATE INDEX IF NOT EXISTS idx_rt_session ON refresh_tokens(session_id);

-- ============================================================
-- MISSING TENANT_ID INDEXES (multi-tenant query optimization)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_prescriptions_tenant ON prescriptions(tenant_id, clinical_record_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_tenant ON invoice_items(tenant_id, invoice_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_tenant ON refresh_tokens(tenant_id, user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_tenant ON password_reset_tokens(tenant_id, user_id);
CREATE INDEX IF NOT EXISTS idx_booking_status_history_tenant ON booking_status_history(tenant_id, booking_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_tenant ON webhook_deliveries(tenant_id, subscription_id);
CREATE INDEX IF NOT EXISTS idx_lab_result_history_tenant ON lab_result_history(tenant_id, patient_id);
CREATE INDEX IF NOT EXISTS idx_lab_areas_tenant ON lab_areas(tenant_id, active);

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

DROP TRIGGER IF EXISTS update_lab_areas_updated_at ON lab_areas;
CREATE TRIGGER update_lab_areas_updated_at
  BEFORE UPDATE ON lab_areas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_medical_history_updated_at ON medical_history;
CREATE TRIGGER update_medical_history_updated_at
  BEFORE UPDATE ON medical_history
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_webhook_subscriptions_updated_at ON webhook_subscriptions;
CREATE TRIGGER update_webhook_subscriptions_updated_at
  BEFORE UPDATE ON webhook_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_lab_samples_updated_at ON lab_samples;
CREATE TRIGGER update_lab_samples_updated_at
  BEFORE UPDATE ON lab_samples
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_lab_equipment_updated_at ON lab_equipment;
CREATE TRIGGER update_lab_equipment_updated_at
  BEFORE UPDATE ON lab_equipment
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_lab_reagents_updated_at ON lab_reagents;
CREATE TRIGGER update_lab_reagents_updated_at
  BEFORE UPDATE ON lab_reagents
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

-- ============================================================
-- 18. CLINICAL TEMPLATES
-- ============================================================
CREATE TABLE clinical_templates (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  specialty TEXT,
  fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_clinical_templates_tenant ON clinical_templates (tenant_id);

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
