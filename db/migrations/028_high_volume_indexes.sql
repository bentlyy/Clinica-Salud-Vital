-- Migration: High-volume indexes for 100K+ users scalability

-- 1. Composite index for doctor booking lookups (most frequent query)
CREATE INDEX  IF NOT EXISTS idx_bookings_doctor_date_status
  ON bookings(doctor_id, date, status)
  WHERE status != 'cancelled';

-- 2. Index for doctor daily agenda
CREATE INDEX  IF NOT EXISTS idx_bookings_doctor_date_time
  ON bookings(doctor_id, date, time);

-- 3. Partial index for active bookings only (reduces index size)
CREATE INDEX  IF NOT EXISTS idx_bookings_active
  ON bookings(tenant_id, date, status)
  WHERE status = 'confirmed';

-- 4. Audit logs by tenant and date (for compliance queries)
CREATE INDEX  IF NOT EXISTS idx_audit_logs_tenant_created
  ON audit_logs(tenant_id, created_at DESC);

-- 5. GIN index for JSONB vital signs queries
CREATE INDEX  IF NOT EXISTS idx_clinical_records_vitals_gin
  ON clinical_records USING GIN (vital_signs jsonb_path_ops);

-- 6. ML prediction history lookup
CREATE INDEX  IF NOT EXISTS idx_ml_predictions_model_tenant
  ON ml_prediction_history(model_type, tenant_id, created_at DESC);

-- 7. Functional index for RUT lookup without formatting
CREATE INDEX  IF NOT EXISTS idx_users_rut_clean_lookup
  ON users(REPLACE(rut, '.', ''), tenant_id)
  WHERE rut IS NOT NULL;

-- 8. Booking overlap detection index (for slot validation)
CREATE INDEX  IF NOT EXISTS idx_bookings_overlap
  ON bookings(doctor_id, date, time, (time + (duration || ' minutes')::INTERVAL), status)
  WHERE status NOT IN ('cancelled');

-- 9. User lookup by email + tenant (login fast path)
CREATE INDEX  IF NOT EXISTS idx_users_email_tenant
  ON users(email, tenant_id);

-- 10. Refresh token lookup (auth refresh flow)
CREATE INDEX  IF NOT EXISTS idx_refresh_tokens_token_active
  ON refresh_tokens(token, revoked, expires_at)
  WHERE revoked = false AND expires_at > NOW();

-- 11. Doctor availability lookup
CREATE INDEX  IF NOT EXISTS idx_doctor_availability_doctor_day
  ON doctor_availability(doctor_id, day_of_week);

-- 12. Doctor exceptions lookup
CREATE INDEX  IF NOT EXISTS idx_doctor_exceptions_doctor_date
  ON doctor_exceptions(doctor_id, date);
