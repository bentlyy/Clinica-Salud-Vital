-- 055: Eliminar triggers y función enforce_tenant_id
DROP TRIGGER IF EXISTS trg_enforce_tenant_id ON users;
DROP TRIGGER IF EXISTS trg_enforce_tenant_id ON doctors;
DROP TRIGGER IF EXISTS trg_enforce_tenant_id ON bookings;
DROP TRIGGER IF EXISTS trg_enforce_tenant_id ON clinical_records;
DROP TRIGGER IF EXISTS trg_enforce_tenant_id ON invoices;
DROP TRIGGER IF EXISTS trg_enforce_tenant_id ON lab_requests;
DROP TRIGGER IF EXISTS trg_enforce_tenant_id ON audit_logs;
DROP TRIGGER IF EXISTS trg_enforce_tenant_id ON refresh_tokens;
DROP TRIGGER IF EXISTS trg_enforce_tenant_id ON doctor_availability;
DROP TRIGGER IF EXISTS trg_enforce_tenant_id ON doctor_exceptions;
DROP TRIGGER IF EXISTS trg_clinical_record_version ON clinical_records;
DROP FUNCTION IF EXISTS enforce_tenant_id;
DROP FUNCTION IF EXISTS fn_snapshot_clinical_record;
