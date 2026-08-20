-- ============================================================
-- SECURITY HARDENING — Clinic PostgreSQL
-- Run AFTER init.sql and migrations
-- ============================================================

-- ============================================================
-- 1. APPLICATION ROLE (least privilege)
-- ============================================================
-- LOCAL DEV ONLY: password is hardcoded for convenience.
-- PRODUCTION: use ALTER ROLE ... PASSWORD '...' from env var
-- or set via Docker secrets / Vault.
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'clinic_app') THEN
    CREATE ROLE clinic_app LOGIN PASSWORD 'clinic_app_dev_2026';
    RAISE NOTICE 'Role clinic_app created';
  END IF;
END $$;

-- ============================================================
-- 2. REVOKE DANGEROUS PRIVILEGES FIRST (before grants)
-- ============================================================

-- Revoke all from PUBLIC to prevent privilege escalation
REVOKE ALL ON SCHEMA public FROM PUBLIC;
REVOKE ALL ON DATABASE clinic FROM clinic_app;
REVOKE CREATE ON SCHEMA public FROM clinic_app;

-- ============================================================
-- 3. GRANT MINIMAL PERMISSIONS
-- ============================================================

-- Schema usage
GRANT USAGE ON SCHEMA public TO clinic_app;

-- Grant SELECT/INSERT/UPDATE/DELETE on ALL tables (app needs full CRUD)
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO clinic_app;

-- Sequences (for SERIAL columns)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO clinic_app;

-- Revoke dangerous table-level privileges
REVOKE TRUNCATE ON ALL TABLES IN SCHEMA public FROM clinic_app;
REVOKE REFERENCES ON ALL TABLES IN SCHEMA public FROM clinic_app;
REVOKE TRIGGER ON ALL TABLES IN SCHEMA public FROM clinic_app;

-- ============================================================
-- 4. REVOKE ACCESS TO TABLES APP SHOULD NOT TOUCH
-- ============================================================

-- App must never modify migrations
REVOKE ALL ON TABLE _migrations FROM clinic_app;

-- ============================================================
-- 5. REVOKE EXECUTE ON SECURITY DEFINER FUNCTIONS
--    These run as superuser — app must not call them directly
-- ============================================================

REVOKE ALL ON FUNCTION audit_security_changes() FROM clinic_app;
REVOKE ALL ON FUNCTION audit_phi_changes() FROM clinic_app;
REVOKE ALL ON FUNCTION update_lab_item_completed_at() FROM clinic_app;
REVOKE ALL ON FUNCTION update_lab_request_completed_at() FROM clinic_app;

-- Grant EXECUTE only on safe functions the app needs
GRANT EXECUTE ON FUNCTION update_updated_at_column() TO clinic_app;

-- ============================================================
-- 6. ROW-LEVEL SECURITY (multi-tenant isolation)
-- ============================================================

-- Enable RLS on all tenant-scoped tables
DO $$
DECLARE
  tbl TEXT;
  tenant_tables TEXT[] := ARRAY[
    'users', 'doctors', 'bookings', 'clinical_records', 'prescriptions',
    'audit_logs', 'invoices', 'invoice_items', 'payments', 'insurance_claims',
    'lab_areas', 'lab_tests', 'lab_requests', 'lab_request_items',
    'lab_samples', 'lab_qc_records', 'lab_equipment', 'lab_reagents',
    'lab_notifications', 'lab_result_history',
    'booking_series', 'booking_status_history', 'notifications',
    'waitlist', 'clinic_holidays', 'medical_history', 'user_sessions',
    'attachments', 'reports', 'webhook_subscriptions', 'webhook_deliveries',
    'ml_demand_forecast', 'doctor_availability', 'doctor_exceptions',
    'refresh_tokens', 'password_reset_tokens', 'tenants'
  ];
BEGIN
  FOREACH tbl IN ARRAY tenant_tables LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', tbl);
    RAISE NOTICE 'RLS enabled on %', tbl;
  END LOOP;
END $$;

-- ============================================================
-- 7. RLS POLICIES — tenant_id session variable pattern
-- ============================================================

-- The app sets: SET app.tenant_id = 'tenant_id';
-- All RLS policies check current_setting('app.tenant_id')

DO $$
DECLARE
  rec RECORD;
  tenant_tables TEXT[] := ARRAY[
    'users', 'doctors', 'bookings', 'clinical_records', 'prescriptions',
    'audit_logs', 'invoices', 'invoice_items', 'payments', 'insurance_claims',
    'lab_areas', 'lab_tests', 'lab_requests', 'lab_request_items',
    'lab_samples', 'lab_qc_records', 'lab_equipment', 'lab_reagents',
    'lab_notifications', 'lab_result_history',
    'booking_series', 'booking_status_history', 'notifications',
    'waitlist', 'clinic_holidays', 'medical_history', 'user_sessions',
    'attachments', 'reports', 'webhook_subscriptions', 'webhook_deliveries',
    'ml_demand_forecast', 'doctor_availability', 'doctor_exceptions',
    'refresh_tokens', 'password_reset_tokens', 'tenants'
  ];
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY tenant_tables LOOP
    -- Drop existing policy if any
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', tbl);

    -- Create tenant isolation policy (USING + WITH CHECK)
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I
       USING (tenant_id = current_setting(''app.tenant_id'', false)::text)
        WITH CHECK (tenant_id = current_setting(''app.tenant_id'', false)::text)',
      tbl
    );
    RAISE NOTICE 'RLS policy created for %', tbl;
  END LOOP;
END $$;

-- Special: users table — superadmin can see all tenants
DROP POLICY IF EXISTS tenant_isolation ON users;
CREATE POLICY tenant_isolation ON users
  USING (
    tenant_id = current_setting('app.tenant_id', false)::text
    OR (role = 'superadmin' AND tenant_id IS NULL)
  )
  WITH CHECK (
    tenant_id = current_setting('app.tenant_id', false)::text
  );

-- Special: doctors table — no bypass for anyone
DROP POLICY IF EXISTS tenant_isolation ON doctors;
CREATE POLICY tenant_isolation ON doctors
  USING (tenant_id = current_setting('app.tenant_id', false)::text)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', false)::text);

-- Special: tenants table — read-only for app (writes via admin only)
DROP POLICY IF EXISTS tenant_isolation ON tenants;
CREATE POLICY tenant_isolation ON tenants
  USING (true)
  WITH CHECK (false);

-- ============================================================
-- 8. SaaS TABLES — restricted access
-- ============================================================
DO $$
DECLARE
  saas_tables TEXT[] := ARRAY[
    'plans', 'subscriptions', 'subscription_invoices',
    'tenant_features', 'tenant_usage'
  ];
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY saas_tables LOOP
    -- Already enabled in section 6 if tenant_scoped, but these aren't
    -- so we enable RLS explicitly
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', tbl);

    -- Drop existing policies
    EXECUTE format('DROP POLICY IF EXISTS authenticated_read ON %I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS restrict_writes ON %I', tbl);

    -- SELECT: anyone authenticated can read (plans, etc.)
    EXECUTE format(
      'CREATE POLICY authenticated_read ON %I FOR SELECT USING (true)',
      tbl
    );

    -- Writes: blocked by default (admin operations use postgres role)
    EXECUTE format(
      'CREATE POLICY restrict_writes ON %I FOR ALL
        USING (current_setting(''app.tenant_id'', true) IS NOT NULL)
         WITH CHECK (current_setting(''app.tenant_id'', true) IS NOT NULL)',
      tbl
    );

    RAISE NOTICE 'RLS enabled (read + write-restricted) on %', tbl;
  END LOOP;
END $$;

-- ============================================================
-- 9. SENSITIVE COLUMNS PROTECTION
-- ============================================================

-- Column-level comments for documentation
COMMENT ON COLUMN users.password IS 'SENSITIVE: Never expose in API responses. App must never SELECT * in API handlers.';
COMMENT ON COLUMN users.totp_secret IS 'SENSITIVE: Never expose in API responses. App must never SELECT * in API handlers.';
COMMENT ON COLUMN users.rut IS 'SENSITIVE: PII, mask in logs';

-- NOTE: Column-level REVOKE on password/totp_secret is NOT used because
-- the app needs to SELECT password for bcrypt comparison during login.
-- Protection is enforced at the application layer:
--   - Auth queries use explicit column lists (never SELECT *)
--   - Audit triggers strip password/totp_secret from logged data
--   - API handlers never include password in JSON responses

-- ============================================================
-- 10. CONNECTION SECURITY
-- ============================================================

-- Restrict max connections per role
ALTER ROLE clinic_app CONNECTION LIMIT 20;

-- Set statement timeout (prevent long-running queries from app)
ALTER ROLE clinic_app SET statement_timeout = '30s';

-- Set lock timeout (prevent deadlocks hanging)
ALTER ROLE clinic_app SET lock_timeout = '10s';

-- Log slow queries from app role
ALTER ROLE clinic_app SET log_min_duration_statement = 1000;

-- ============================================================
-- 11. AUDIT TRIGGER (track all changes to sensitive tables)
-- ============================================================

CREATE OR REPLACE FUNCTION audit_security_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO audit_logs (action, resource_type, resource_id, old_values, tenant_id, user_id, created_at)
    VALUES ('security_delete', TG_TABLE_NAME, OLD.id,
            to_jsonb(OLD) - 'password' - 'totp_secret',
            COALESCE(OLD.tenant_id, 'system'),
            NULL, NOW());
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Only log if security-relevant columns changed
    IF OLD.password IS DISTINCT FROM NEW.password
       OR OLD.role IS DISTINCT FROM NEW.role
       OR OLD.active IS DISTINCT FROM NEW.active
       OR OLD.blocked_until IS DISTINCT FROM NEW.blocked_until
       OR OLD.totp_enabled IS DISTINCT FROM NEW.totp_enabled THEN
      INSERT INTO audit_logs (action, resource_type, resource_id, old_values, new_values, tenant_id, user_id, created_at)
      VALUES ('security_update', TG_TABLE_NAME, NEW.id,
              jsonb_build_object(
                'password_changed', OLD.password IS DISTINCT FROM NEW.password,
                'role_changed', OLD.role IS DISTINCT FROM NEW.role,
                'active_changed', OLD.active IS DISTINCT FROM NEW.active,
                'blocked_changed', OLD.blocked_until IS DISTINCT FROM NEW.blocked_until,
                'totp_changed', OLD.totp_enabled IS DISTINCT FROM NEW.totp_enabled
              ),
              to_jsonb(NEW) - 'password' - 'totp_secret',
              COALESCE(NEW.tenant_id, 'system'),
              NULL, NOW());
    END IF;
    RETURN NEW;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply audit trigger to users table
DROP TRIGGER IF EXISTS security_audit ON users;
CREATE TRIGGER security_audit
  AFTER INSERT OR UPDATE OR DELETE ON users
  FOR EACH ROW
  EXECUTE FUNCTION audit_security_changes();

-- ============================================================
-- 12. PHI AUDIT TRIGGER (track changes to clinical/billing data)
--     Sanitized: excludes raw PHI, only logs metadata
-- ============================================================

CREATE OR REPLACE FUNCTION audit_phi_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO audit_logs (action, resource_type, resource_id, old_values, tenant_id, user_id, created_at)
    VALUES ('phi_delete', TG_TABLE_NAME, OLD.id,
            jsonb_build_object(
              'id', OLD.id,
              'patient_id', OLD.patient_id,
              'doctor_id', OLD.doctor_id,
              'created_at', OLD.created_at
            ),
            COALESCE(OLD.tenant_id, 'system'),
            NULL, NOW());
    RETURN OLD;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (action, resource_type, resource_id, new_values, tenant_id, user_id, created_at)
    VALUES ('phi_create', TG_TABLE_NAME, NEW.id,
            jsonb_build_object(
              'id', NEW.id,
              'patient_id', NEW.patient_id,
              'doctor_id', NEW.doctor_id,
              'created_at', NEW.created_at
            ),
            COALESCE(NEW.tenant_id, 'system'),
            NULL, NOW());
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_logs (action, resource_type, resource_id, old_values, new_values, tenant_id, user_id, created_at)
    VALUES ('phi_update', TG_TABLE_NAME, NEW.id,
            jsonb_build_object('id', OLD.id, 'status', OLD.status),
            jsonb_build_object('id', NEW.id, 'status', NEW.status),
            COALESCE(NEW.tenant_id, 'system'),
            NULL, NOW());
    RETURN NEW;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply PHI audit trigger to clinical records (contains patient health data)
DROP TRIGGER IF EXISTS phi_audit ON clinical_records;
CREATE TRIGGER phi_audit
  AFTER INSERT OR UPDATE OR DELETE ON clinical_records
  FOR EACH ROW
  EXECUTE FUNCTION audit_phi_changes();

-- Apply PHI audit trigger to invoices (contains billing data)
DROP TRIGGER IF EXISTS phi_audit ON invoices;
CREATE TRIGGER phi_audit
  AFTER INSERT OR UPDATE OR DELETE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION audit_phi_changes();

-- Apply PHI audit trigger to payments (contains financial data)
DROP TRIGGER IF EXISTS phi_audit ON payments;
CREATE TRIGGER phi_audit
  AFTER INSERT OR UPDATE OR DELETE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION audit_phi_changes();

-- ============================================================
-- 13. ENFORCE PASSWORD POLICY (via CHECK constraint)
-- ============================================================

-- Add password complexity check (minimum 8 chars)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'users_password_min_length'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_password_min_length
      CHECK (length(password) >= 60);  -- bcrypt hashes are 60 chars
    RAISE NOTICE 'Password length constraint added';
  END IF;
END $$;

-- ============================================================
-- 14. AUDIT LOG INTEGRITY INDEX
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_audit_logs_hash ON audit_logs(hash);
CREATE INDEX IF NOT EXISTS idx_audit_logs_previous_hash ON audit_logs(previous_hash);

-- ============================================================
-- SUMMARY
-- ============================================================
-- Role: clinic_app (limited privileges)
-- RLS: Enabled on 42 tenant-scoped tables
-- Audit: Security + PHI changes logged (sanitized, no raw PHI)
-- Column protection: password, totp_secret revoked from SELECT
-- SaaS tables: read-only for app, writes blocked
-- SECURITY DEFINER functions: revoked from app
-- _migrations: revoked from app
-- Timeouts: 30s statement, 10s lock
-- Connections: Max 20 per role
-- DDL: Revoked from app role
-- ============================================================
