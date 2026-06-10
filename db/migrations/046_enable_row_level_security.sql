-- 046: Enable Row-Level Security on ALL tenant-isolated tables
-- Uses current_setting('app.tenant_id') set by db.ts wrappedQuery
-- Adds superadmin bypass via current_setting('app.user_role')
-- CRITICAL: Every table with tenant_id MUST have RLS to prevent cross-tenant leakage

BEGIN;

-- ============================================================
-- 1. Helper function to format tenant isolation condition (unused but useful for refs)
-- ============================================================
CREATE OR REPLACE FUNCTION tenant_isolation_condition(tenant_col TEXT DEFAULT 'tenant_id')
RETURNS TEXT AS $$
BEGIN
  RETURN format('%I = current_setting(''app.tenant_id'')::TEXT', tenant_col);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================
-- 2. Enable RLS + FORCE RLS + create policies on ALL tenant tables
-- ============================================================
DO $$
DECLARE
  tbl TEXT;
  tables TEXT[] := ARRAY[
    -- Core clinical tables (from init.sql)
    'users',
    'doctors',
    'bookings',
    'doctor_availability',
    'doctor_exceptions',
    'clinical_records',
    'prescriptions',
    'audit_logs',

    -- Billing module
    'invoices',
    'invoice_items',
    'payments',
    'insurance_claims',

    -- Laboratory module
    'lab_tests',
    'lab_requests',
    'lab_request_items',

    -- RBAC module
    'permissions',
    'role_permissions',
    'user_permissions',

    -- ML module
    'ml_prediction_history',
    'ml_model_metrics',
    'ml_demand_forecast',
    'ml_experiments',
    'ml_runs',
    'ml_run_params',
    'ml_run_metrics',
    'ml_run_artifacts',

    -- Auth & webhooks
    'refresh_tokens',
    'webhooks',
    'webhook_deliveries',
    'notification_preferences',
    'password_reset_tokens',

    -- SaaS multi-tenant
    'subscriptions',
    'subscription_invoices',
    'tenant_features',
    'tenant_usage',

    -- GDPR / HIPAA compliance
    'user_consents',
    'data_retention_policy',
    'phi_access_log',
    'encryption_keys',

    -- Clinical record versioning
    'clinical_record_versions',

    -- Specialties (tenant-scoped catalog)
    'specialties'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    -- Guard: skip if table does not exist (fresh install may differ)
    IF EXISTS (SELECT 1 FROM pg_class WHERE relname = tbl AND relkind = 'r') THEN
      -- Enable RLS (idempotent)
      EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
      EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', tbl);

      -- Drop legacy policy names from previous migrations
      EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', tbl);
      EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_policy ON %I', tbl);
      EXECUTE format('DROP POLICY IF EXISTS superadmin_bypass ON %I', tbl);
      EXECUTE format('DROP POLICY IF EXISTS superadmin_access ON %I', tbl);

      -- Primary tenant isolation policy
      -- Uses CURRENT_SETTING with TRUE flag so it returns NULL if not set (safe fallback)
      EXECUTE format(
        'CREATE POLICY tenant_isolation_policy ON %I FOR ALL
         USING (
           COALESCE(NULLIF(current_setting(''app.tenant_id'', true), ''''), ''NOT_SET'') = tenant_id
         )
         WITH CHECK (
           COALESCE(NULLIF(current_setting(''app.tenant_id'', true), ''''), ''NOT_SET'') = tenant_id
         )',
        tbl
      );

      -- Superadmin bypass policy: when app.user_role = 'superadmin', allow full access
      -- This relies on the middleware setting app.user_role via set_config()
      EXECUTE format(
        'CREATE POLICY superadmin_bypass ON %I FOR ALL
         USING (
           current_setting(''app.user_role'', true) = ''superadmin''
         )',
        tbl
      );

    END IF;
  END LOOP;
END $$;

-- ============================================================
-- 3. Verify RLS state and log to _rls_audit (created by migration 024)
-- ============================================================
DO $$
DECLARE
  tbl TEXT;
  rls BOOLEAN;
  forced BOOLEAN;
  policies INTEGER;
  tables TEXT[] := ARRAY[
    'users', 'doctors', 'bookings', 'doctor_availability', 'doctor_exceptions',
    'clinical_records', 'prescriptions', 'audit_logs',
    'invoices', 'invoice_items', 'payments', 'insurance_claims',
    'lab_tests', 'lab_requests', 'lab_request_items',
    'permissions', 'role_permissions', 'user_permissions',
    'ml_prediction_history', 'ml_model_metrics', 'ml_demand_forecast',
    'ml_experiments', 'ml_runs', 'ml_run_params', 'ml_run_metrics', 'ml_run_artifacts',
    'refresh_tokens', 'webhooks', 'webhook_deliveries', 'notification_preferences',
    'password_reset_tokens',
    'subscriptions', 'subscription_invoices', 'tenant_features', 'tenant_usage',
    'user_consents', 'data_retention_policy', 'phi_access_log', 'encryption_keys',
    'clinical_record_versions', 'specialties'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    IF EXISTS (SELECT 1 FROM pg_class WHERE relname = tbl AND relkind = 'r') THEN
      SELECT relrowsecurity, relforcerowsecurity
        INTO rls, forced
        FROM pg_class WHERE relname = tbl;
      SELECT count(*) INTO policies
        FROM pg_policies
        WHERE tablename = tbl
          AND polname IN ('tenant_isolation_policy', 'superadmin_bypass');

      INSERT INTO _rls_audit (table_name, rls_enabled, rls_forced, policy_count)
      VALUES (tbl, COALESCE(rls, false), COALESCE(forced, false), policies);
    END IF;
  END LOOP;
END $$;

-- ============================================================
-- 4. Register migration
-- ============================================================
INSERT INTO _migrations (name, applied_at) VALUES ('046_enable_row_level_security', NOW())
ON CONFLICT (name) DO NOTHING;

COMMIT;
