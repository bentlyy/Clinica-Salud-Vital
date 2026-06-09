-- Migration: Force RLS + enforce tenant_id on ALL queries
-- CRITICAL: Prevents data leakage between tenants

-- 1. Verify and enable RLS on ALL tenant-scoped tables
DO $$
DECLARE
  tbl TEXT;
  missing_rls TEXT[] := '{}';
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'users', 'doctors', 'bookings', 'doctor_availability', 'doctor_exceptions',
      'clinical_records', 'prescriptions', 'audit_logs',
      'invoices', 'invoice_items', 'payments', 'insurance_claims',
      'lab_tests', 'lab_requests', 'lab_request_items',
      'ml_prediction_history', 'ml_model_metrics', 'ml_demand_forecast',
      'refresh_tokens', 'webhooks', 'webhook_deliveries', 'notification_preferences',
      'specialties', 'subscriptions', 'subscription_invoices', 'tenant_features', 'tenant_usage'
    ])
  LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = tbl AND rowsecurity = true) THEN
      EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
      EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', tbl);
      missing_rls := array_append(missing_rls, tbl);
    END IF;
  END LOOP;

  IF array_length(missing_rls, 1) > 0 THEN
    RAISE NOTICE 'RLS enabled on: %', missing_rls;
  ELSE
    RAISE NOTICE 'All tables already have RLS enabled';
  END IF;
END $$;

-- 2. Drop existing policies and recreate with superadmin bypass
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'users', 'doctors', 'bookings', 'doctor_availability', 'doctor_exceptions',
      'clinical_records', 'prescriptions', 'audit_logs',
      'invoices', 'invoice_items', 'payments', 'insurance_claims',
      'lab_tests', 'lab_requests', 'lab_request_items',
      'ml_prediction_history', 'ml_model_metrics', 'ml_demand_forecast',
      'refresh_tokens', 'webhooks', 'webhook_deliveries', 'notification_preferences',
      'specialties', 'subscriptions', 'subscription_invoices', 'tenant_features', 'tenant_usage'
    ])
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', tbl);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I FOR ALL
       USING (
         current_setting(''app.tenant_id'', true) IS NULL
         OR current_setting(''app.tenant_id'', true) = ''''
         OR current_setting(''app.tenant_id'', true) = ''superadmin''
         OR tenant_id = current_setting(''app.tenant_id'', true)
       )',
      tbl
    );
  END LOOP;
END $$;

-- 3. Trigger that PREVENTS inserts without tenant_id
CREATE OR REPLACE FUNCTION enforce_tenant_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tenant_id IS NULL OR NEW.tenant_id = '' THEN
    NEW.tenant_id := NULLIF(current_setting('app.tenant_id', true), '');
    IF NEW.tenant_id IS NULL OR NEW.tenant_id = '' THEN
      RAISE EXCEPTION 'tenant_id is REQUIRED. Set app.tenant_id via set_config() before inserting.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all critical tenant-scoped tables
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'users', 'doctors', 'bookings', 'clinical_records', 'invoices',
      'lab_requests', 'audit_logs', 'ml_prediction_history',
      'webhooks', 'subscriptions', 'refresh_tokens'
    ])
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_enforce_tenant_id ON %I', tbl);
    EXECUTE format(
      'CREATE TRIGGER trg_enforce_tenant_id BEFORE INSERT ON %I
       FOR EACH ROW EXECUTE FUNCTION enforce_tenant_id()',
      tbl
    );
  END LOOP;
END $$;

-- 4. Add CHECK constraint to prevent empty tenant_id
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'users', 'doctors', 'bookings', 'clinical_records', 'invoices',
      'lab_requests', 'audit_logs', 'ml_prediction_history',
      'webhooks', 'subscriptions', 'refresh_tokens'
    ])
  LOOP
    EXECUTE format(
      'ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I',
      tbl, format('ck_%I_tenant_id_not_empty', tbl)
    );
    EXECUTE format(
      'ALTER TABLE %I ADD CONSTRAINT %I CHECK (tenant_id IS NOT NULL AND tenant_id <> '')',
      tbl, format('ck_%I_tenant_id_not_empty', tbl)
    );
  END LOOP;
END $$;

-- 5. Log current RLS state for verification
CREATE TABLE IF NOT EXISTS _rls_audit (
  id SERIAL PRIMARY KEY,
  table_name TEXT NOT NULL,
  rls_enabled BOOLEAN NOT NULL,
  rls_forced BOOLEAN NOT NULL,
  policy_count INTEGER NOT NULL,
  checked_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$
DECLARE
  tbl TEXT;
  rls BOOLEAN;
  forced BOOLEAN;
  policies INTEGER;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'users', 'doctors', 'bookings', 'doctor_availability', 'doctor_exceptions',
      'clinical_records', 'prescriptions', 'audit_logs',
      'invoices', 'invoice_items', 'payments', 'insurance_claims',
      'lab_tests', 'lab_requests', 'lab_request_items',
      'ml_prediction_history', 'ml_model_metrics', 'ml_demand_forecast',
      'refresh_tokens', 'webhooks', 'webhook_deliveries', 'notification_preferences',
      'subscriptions', 'subscription_invoices', 'tenant_features', 'tenant_usage'
    ])
  LOOP
    SELECT relrowsecurity, relforcerowsecurity
      INTO rls, forced
      FROM pg_class WHERE relname = tbl;
    SELECT count(*) INTO policies
      FROM pg_policies WHERE tablename = tbl;
    INSERT INTO _rls_audit (table_name, rls_enabled, rls_forced, policy_count)
    VALUES (tbl, COALESCE(rls, false), COALESCE(forced, false), policies);
  END LOOP;
END $$;
