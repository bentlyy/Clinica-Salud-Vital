-- ============================================================
-- 027: Performance — índices faltantes detectados en auditoría
-- ============================================================
-- Justificación (ver informe de auditoría de rendimiento):
-- 1. En PostgreSQL las Foreign Keys NO crean índice; las FKs de las
--    tablas que más crecen generan seq scans en JOIN y bloquean
--    DELETE CASCADE.
-- 2. El trigger de integridad HMAC de audit_logs hace
--    `SELECT hash ... ORDER BY created_at DESC LIMIT 1` sin filtro de
--    tenant -> necesita índice standalone en created_at.
-- 3. Los COUNT(*) del dashboard filtran por (tenant_id, status) ->
--    índice compuesto.
-- Todos los índices son aditivos e idempotentes (IF NOT EXISTS).

-- audit_logs: trigger HMAC (ORDER BY created_at DESC LIMIT 1)
CREATE INDEX IF NOT EXISTS idx_audit_logs_created
  ON audit_logs (created_at DESC);

-- audit_logs: consultas de auditoría por usuario (LEFT JOIN users)
CREATE INDEX IF NOT EXISTS idx_audit_logs_user
  ON audit_logs (user_id, tenant_id);

-- clinical_records: JOIN/traza por booking
CREATE INDEX IF NOT EXISTS idx_clinical_records_booking
  ON clinical_records (booking_id);

-- invoices: consultas por doctor y por booking (FK sin índice)
CREATE INDEX IF NOT EXISTS idx_invoices_doctor
  ON invoices (doctor_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoices_booking
  ON invoices (booking_id);

-- invoices: estado + vencimiento para facturación/overdue
CREATE INDEX IF NOT EXISTS idx_invoices_tenant_status_due
  ON invoices (tenant_id, status, due_date);

-- lab_requests: FKs doctor_id / lab_area_id / clinical_record_id
CREATE INDEX IF NOT EXISTS idx_lab_requests_doctor
  ON lab_requests (doctor_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_lab_requests_area
  ON lab_requests (lab_area_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_lab_requests_clinical_record
  ON lab_requests (clinical_record_id);

-- lab_request_items: agrupación por test / área
CREATE INDEX IF NOT EXISTS idx_lab_request_items_test
  ON lab_request_items (lab_test_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_lab_request_items_area
  ON lab_request_items (lab_area_id, tenant_id);

-- bookings: COUNT del dashboard por (tenant_id, status)
CREATE INDEX IF NOT EXISTS idx_bookings_tenant_status
  ON bookings (tenant_id, status);

-- lab_samples: listados por estado
CREATE INDEX IF NOT EXISTS idx_lab_samples_tenant_status
  ON lab_samples (tenant_id, status);

-- insurance_claims: lookup por factura
CREATE INDEX IF NOT EXISTS idx_insurance_claims_invoice
  ON insurance_claims (invoice_id);

-- subscriptions: JOIN con plans (plan distribution)
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan
  ON subscriptions (plan_id);