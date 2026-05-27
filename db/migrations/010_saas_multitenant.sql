-- ============================================================
-- SAAS MULTI-TENANT MIGRATION
-- Adds tenant_id to all entity tables + creates plan/subscription tables
-- ============================================================

-- 1. Add tenant_id to all entity tables with default 'default'
  ALTER TABLE doctors ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'default';
  ALTER TABLE bookings ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'default';
  ALTER TABLE doctor_availability ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'default';
  ALTER TABLE doctor_exceptions ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'default';
  ALTER TABLE clinical_records ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'default';
  ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'default';
  ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'default';
  ALTER TABLE invoices ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'default';
  ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'default';
  ALTER TABLE payments ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'default';
  ALTER TABLE insurance_claims ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'default';
  ALTER TABLE lab_tests ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'default';
  ALTER TABLE lab_requests ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'default';
  ALTER TABLE lab_request_items ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'default';
  ALTER TABLE permissions ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'default';
  ALTER TABLE role_permissions ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'default';
  ALTER TABLE user_permissions ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'default';
  ALTER TABLE ml_prediction_history ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'default';
  ALTER TABLE ml_model_metrics ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'default';
  ALTER TABLE ml_demand_forecast ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'default';
  ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'default';
  ALTER TABLE webhooks ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'default';
  ALTER TABLE webhook_deliveries ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'default';
  ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'default';
  ALTER TABLE specialties ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'default';

-- 2. Create composite indexes for tenant isolation
CREATE INDEX IF NOT EXISTS idx_doctors_tenant ON doctors(tenant_id, id);
CREATE INDEX IF NOT EXISTS idx_bookings_tenant ON bookings(tenant_id, doctor_id, date);
CREATE INDEX IF NOT EXISTS idx_clinical_records_tenant ON clinical_records(tenant_id, patient_id);
CREATE INDEX IF NOT EXISTS idx_invoices_tenant ON invoices(tenant_id, patient_id);
CREATE INDEX IF NOT EXISTS idx_lab_requests_tenant ON lab_requests(tenant_id, patient_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant ON audit_logs(tenant_id, created_at);
CREATE INDEX IF NOT EXISTS idx_prescriptions_tenant ON prescriptions(tenant_id, clinical_record_id);
CREATE INDEX IF NOT EXISTS idx_payments_tenant ON payments(tenant_id, invoice_id);
CREATE INDEX IF NOT EXISTS idx_insurance_claims_tenant ON insurance_claims(tenant_id, patient_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_tenant ON refresh_tokens(tenant_id, user_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_tenant ON webhooks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_tenant ON notification_preferences(tenant_id, user_id);

-- 3. Plans table
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

-- 4. Subscriptions table
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

CREATE INDEX IF NOT EXISTS idx_subscriptions_tenant ON subscriptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan ON subscriptions(plan_id);

-- 5. Subscription invoice table (for SaaS billing, not clinical invoices)
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

-- 6. Feature flags table
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

-- 7. Usage metering table
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

-- 8. Insert default plans
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

-- 9. Add superadmin role to user roles
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('superadmin', 'admin', 'doctor', 'patient', 'guest', 'user'));

-- 10. Add tenant_id to users if not already present (migration 007 may have already added it)
ALTER TABLE users ADD COLUMN IF NOT EXISTS tenant_id TEXT;

-- 11. Trigger for subscriptions updated_at
DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 12. Trigger for plans updated_at
DROP TRIGGER IF EXISTS update_plans_updated_at ON plans;
CREATE TRIGGER update_plans_updated_at
  BEFORE UPDATE ON plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
