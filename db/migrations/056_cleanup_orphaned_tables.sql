-- 056: Eliminar tablas huérfanas y redundantes
DROP TABLE IF EXISTS slow_query_log CASCADE;
DROP TABLE IF EXISTS table_size_snapshot CASCADE;
DROP TABLE IF EXISTS clinical_record_versions CASCADE;
DROP TABLE IF EXISTS idempotency_keys CASCADE;
DROP TABLE IF EXISTS _schema_meta CASCADE;
DROP TABLE IF EXISTS notification_preferences CASCADE;

-- Eliminar índices redundantes (cubiertos por otros compuestos o no usados)
DROP INDEX IF EXISTS idx_users_role;
DROP INDEX IF EXISTS idx_users_tenant_role;
DROP INDEX IF EXISTS idx_doctors_user;
DROP INDEX IF EXISTS idx_doctors_name;
DROP INDEX IF EXISTS idx_bookings_user;
DROP INDEX IF EXISTS idx_bookings_date;
DROP INDEX IF EXISTS idx_availability_doctor;
DROP INDEX IF EXISTS idx_clinical_records_doctor;
DROP INDEX IF EXISTS idx_clinical_records_patient;
DROP INDEX IF EXISTS idx_prescriptions_record;
DROP INDEX IF EXISTS idx_lab_requests_patient;
DROP INDEX IF EXISTS idx_lab_requests_doctor;
DROP INDEX IF EXISTS idx_lab_tests_request;
DROP INDEX IF EXISTS idx_invoices_patient;
DROP INDEX IF EXISTS idx_invoice_items_invoice;
DROP INDEX IF EXISTS idx_audit_logs_user;
DROP INDEX IF EXISTS idx_audit_logs_entity;
DROP INDEX IF EXISTS idx_audit_logs_tenant;
DROP INDEX IF EXISTS idx_refresh_tokens_user;
DROP INDEX IF EXISTS idx_exceptions_doctor;
