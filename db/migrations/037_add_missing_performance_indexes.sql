-- Add missing performance indexes identified in audit

-- 1. Booking dashboard queries (often filtered by tenant + date + status)
CREATE INDEX IF NOT EXISTS idx_bookings_tenant_date_status 
  ON bookings(tenant_id, date, status);

-- 2. Audit log queries sorted by date descending (most common pattern)
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_created_desc 
  ON audit_logs(tenant_id, created_at DESC);

-- 3. Clinical records by tenant + patient
CREATE INDEX IF NOT EXISTS idx_clinical_records_tenant_patient 
  ON clinical_records(tenant_id, patient_id);

-- 4. Guest RUT search optimization (functional index for cleaned RUT)
CREATE INDEX IF NOT EXISTS idx_bookings_guest_rut_clean 
  ON bookings(REPLACE(REPLACE(COALESCE(guest_rut, ''), '.', ''), '-', '')) 
  WHERE guest_rut IS NOT NULL;

-- 5. Users by tenant + email (login optimization)
CREATE INDEX IF NOT EXISTS idx_users_tenant_email 
  ON users(tenant_id, email);

-- 6. Refresh tokens cleanup index
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires 
  ON refresh_tokens(expires_at) WHERE revoked = false;

-- 7. ML predictions by tenant + model
CREATE INDEX IF NOT EXISTS idx_ml_predictions_tenant_model 
  ON ml_prediction_history(tenant_id, model_type, prediction_date DESC);

-- 8. Subscription lookup optimization
CREATE INDEX IF NOT EXISTS idx_subscriptions_tenant_status 
  ON subscriptions(tenant_id, status);
