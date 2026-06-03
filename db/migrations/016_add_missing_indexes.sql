-- Missing indexes for performance optimization

-- Bookings: tenant + doctor + date for common agenda queries (partial index, exclude cancelled)
CREATE INDEX IF NOT EXISTS idx_bookings_tenant_doctor_date_active
  ON bookings(tenant_id, doctor_id, date)
  WHERE status != 'cancelled';

-- Clinical records: tenant + patient for fast lookup
CREATE INDEX IF NOT EXISTS idx_clinical_records_tenant_patient
  ON clinical_records(tenant_id, patient_id);

-- Refresh tokens: expires_at for periodic cleanup queries
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires
  ON refresh_tokens(expires_at);

-- Webhooks: GIN index on events array for event filtering
CREATE INDEX IF NOT EXISTS idx_webhooks_events
  ON webhooks USING GIN(events);
