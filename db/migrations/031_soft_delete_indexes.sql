-- Migration: Soft-delete para tenants + índices faltantes
-- Para 20 clínicas máximo, pero con rendimiento predecible

BEGIN;

-- ==================== SOFT-DELETE TENANTS ====================
ALTER TABLE IF EXISTS tenants ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE IF EXISTS tenants ADD COLUMN IF NOT EXISTS deleted_by INTEGER REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tenants_active ON tenants (active) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_tenants_deleted ON tenants (deleted_at) WHERE deleted_at IS NOT NULL;

-- ==================== ÍNDICES FALTANTES ====================

-- Bookings: filtro frecuente doctor_id + date + status != cancelled
CREATE INDEX  IF NOT EXISTS idx_bookings_doctor_date_active
  ON bookings (doctor_id, date)
  WHERE status != 'cancelled';

-- Bookings: búsqueda por tenant + fecha (slot availability)
CREATE INDEX  IF NOT EXISTS idx_bookings_tenant_date
  ON bookings (tenant_id, date, time)
  WHERE status != 'cancelled';

-- Clinical records: búsqueda por paciente + tenant
CREATE INDEX  IF NOT EXISTS idx_clinical_records_patient_tenant
  ON clinical_records (patient_id, tenant_id, created_at DESC);

-- Clinical records: búsqueda por doctor + tenant
CREATE INDEX  IF NOT EXISTS idx_clinical_records_doctor_tenant
  ON clinical_records (doctor_id, tenant_id, created_at DESC);

-- Users: búsqueda por email + tenant (login)
CREATE INDEX  IF NOT EXISTS idx_users_email_tenant
  ON users (email, tenant_id);

-- Users: búsqueda por rol + tenant
CREATE INDEX  IF NOT EXISTS idx_users_role_tenant
  ON users (role, tenant_id);

-- Doctor availability: slot lookup
CREATE INDEX  IF NOT EXISTS idx_availability_doctor_day
  ON doctor_availability (doctor_id, day_of_week, tenant_id);

-- Doctor exceptions: date lookup
CREATE INDEX  IF NOT EXISTS idx_exceptions_doctor_date
  ON doctor_exceptions (doctor_id, date, tenant_id);

-- Invoices: búsqueda por paciente
CREATE INDEX  IF NOT EXISTS idx_invoices_patient_tenant
  ON invoices (patient_id, tenant_id, created_at DESC);

-- Audit logs: búsqueda temporal
CREATE INDEX  IF NOT EXISTS idx_audit_logs_tenant_created
  ON audit_logs (tenant_id, created_at DESC);

-- Phi access log: ya indexado en 027 (idx_phi_access_log_tenant_date)

-- Refresh tokens: búsqueda por token + no revocado
CREATE INDEX  IF NOT EXISTS idx_refresh_tokens_active
  ON refresh_tokens (token)
  WHERE revoked = false;

-- Password reset tokens: búsqueda activa
CREATE INDEX  IF NOT EXISTS idx_password_reset_tokens_active
  ON password_reset_tokens (token)
  WHERE used = false;

-- Subscriptions: tenant activo
CREATE INDEX  IF NOT EXISTS idx_subscriptions_tenant_active
  ON subscriptions (tenant_id, status)
  WHERE status IN ('active', 'trialing');

COMMIT;
