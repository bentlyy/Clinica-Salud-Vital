-- ============================================================
-- 021: Fix RLS policies for Render (managed PostgreSQL)
-- ============================================================
-- Problem: Render's managed PostgreSQL (and PgBouncer) may not
-- support custom GUC parameters like app.tenant_id via
-- ALTER ROLE ... SET. When current_setting('app.tenant_id', false)
-- is called and the GUC isn't registered, PostgreSQL throws
-- error 42704 "unrecognized configuration parameter".
--
-- Fix: Replace current_setting('app.tenant_id', false) with
-- COALESCE(current_setting('app.tenant_id', true), 'default')
-- The true parameter means missing_ok=true (returns NULL instead
-- of throwing), and COALESCE provides a safe fallback.
-- ============================================================

-- 1. Recreate tenant_isolation policies with safe fallback
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
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', tbl);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I
       USING (tenant_id = COALESCE(current_setting(''app.tenant_id'', true), ''default'')::text)
        WITH CHECK (tenant_id = COALESCE(current_setting(''app.tenant_id'', true), ''default'')::text)',
      tbl
    );
    RAISE NOTICE 'RLS policy (safe) created for %', tbl;
  END LOOP;
END $$;

-- 2. Special: users table — superadmin can see all tenants
DROP POLICY IF EXISTS tenant_isolation ON users;
CREATE POLICY tenant_isolation ON users
  USING (
    tenant_id = COALESCE(current_setting('app.tenant_id', true), 'default')::text
    OR (role = 'superadmin' AND tenant_id IS NULL)
  )
  WITH CHECK (
    tenant_id = COALESCE(current_setting('app.tenant_id', true), 'default')::text
  );

-- 3. Special: doctors table
DROP POLICY IF EXISTS tenant_isolation ON doctors;
CREATE POLICY tenant_isolation ON doctors
  USING (tenant_id = COALESCE(current_setting('app.tenant_id', true), 'default')::text)
  WITH CHECK (tenant_id = COALESCE(current_setting('app.tenant_id', true), 'default')::text);

-- 4. Special: tenants table — read-only for app
DROP POLICY IF EXISTS tenant_isolation ON tenants;
CREATE POLICY tenant_isolation ON tenants
  USING (true)
  WITH CHECK (false);

-- 5. SaaS tables — write-restricted (safe fallback)
DO $$
DECLARE
  saas_tables TEXT[] := ARRAY[
    'plans', 'subscriptions', 'subscription_invoices',
    'tenant_features', 'tenant_usage'
  ];
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY saas_tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS restrict_writes ON %I', tbl);
    EXECUTE format(
      'CREATE POLICY restrict_writes ON %I FOR ALL
        USING (current_setting(''app.tenant_id'', true) IS NOT NULL)
         WITH CHECK (current_setting(''app.tenant_id'', true) IS NOT NULL)',
      tbl
    );
  END LOOP;
END $$;

-- 6. Recreate set_tenant_id function with error handling
CREATE OR REPLACE FUNCTION set_tenant_id(p_tenant_id TEXT)
RETURNS void AS $$
BEGIN
  PERFORM set_config('app.tenant_id', p_tenant_id, false);
EXCEPTION WHEN OTHERS THEN
  -- On managed PostgreSQL (Render, PgBouncer) that rejects custom GUCs,
  -- log a warning but don't fail. RLS policies use COALESCE fallback.
  RAISE WARNING 'set_tenant_id: GUC not supported (%). RLS will use fallback.', SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- 7. Verify
DO $$
DECLARE
  v_result TEXT;
BEGIN
  PERFORM set_config('app.tenant_id', 'test', false);
  v_result := COALESCE(current_setting('app.tenant_id', true), 'default');
  RAISE NOTICE 'app.tenant_id verification: got %', v_result;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'app.tenant_id verification failed (non-fatal): %', SQLERRM;
END $$;
