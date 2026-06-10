-- Migration: Verify no RLS policy contains 'superadmin' bypass and recreate clean policies
-- CRITICAL: Ensures no legacy superadmin string bypass exists in any tenant_isolation policy

BEGIN;

-- 1. Verify NO table has 'superadmin' string bypass in its RLS policy
DO $$
DECLARE
  tbl TEXT;
  pol_def TEXT;
  found_bypass BOOLEAN := false;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'users', 'doctors', 'bookings', 'doctor_availability', 'doctor_exceptions',
      'clinical_records', 'prescriptions', 'audit_logs',
      'invoices', 'invoice_items', 'payments', 'insurance_claims',
      'lab_tests', 'lab_requests', 'lab_request_items',
      'permissions', 'role_permissions', 'user_permissions',
      'ml_prediction_history', 'ml_model_metrics', 'ml_demand_forecast',
      'refresh_tokens', 'webhooks', 'webhook_deliveries', 'notification_preferences',
      'specialties', 'subscriptions', 'subscription_invoices', 'tenant_features', 'tenant_usage',
      'user_consents', 'phi_access_log', 'encryption_keys'
    ])
  LOOP
    SELECT pg_get_expr(p.polqual, p.polrelid)::text
      INTO pol_def
      FROM pg_policy p
      JOIN pg_class c ON p.polrelid = c.oid
      WHERE c.relname = tbl AND p.polname = 'tenant_isolation';

    IF pol_def IS NOT NULL AND pol_def LIKE '%superadmin%' THEN
      RAISE WARNING 'TABLE % STILL HAS SUPERADMIN BYPASS IN tenant_isolation POLICY: %', tbl, pol_def;
      found_bypass := true;
    END IF;
  END LOOP;

  IF found_bypass THEN
    RAISE NOTICE 'Superadmin bypass patterns found — will drop and recreate all policies';
  ELSE
    RAISE NOTICE 'All tables clean — no superadmin bypass found';
  END IF;
END $$;

-- 2. Drop and recreate all tenant_isolation policies WITHOUT superadmin bypass
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
      'permissions', 'role_permissions', 'user_permissions',
      'ml_prediction_history', 'ml_model_metrics', 'ml_demand_forecast',
      'refresh_tokens', 'webhooks', 'webhook_deliveries', 'notification_preferences',
      'specialties', 'subscriptions', 'subscription_invoices', 'tenant_features', 'tenant_usage',
      'user_consents', 'phi_access_log', 'encryption_keys'
    ])
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', tbl);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I FOR ALL
       USING (
         COALESCE(NULLIF(current_setting(''app.tenant_id'', true), ''''), ''NOT_SET'') = tenant_id
       )
       WITH CHECK (
         COALESCE(NULLIF(current_setting(''app.tenant_id'', true), ''''), ''NOT_SET'') = tenant_id
       )',
      tbl
    );
  END LOOP;
END $$;

-- 3. Verify enforcement on all tables
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
      'permissions', 'role_permissions', 'user_permissions',
      'ml_prediction_history', 'ml_model_metrics', 'ml_demand_forecast',
      'refresh_tokens', 'webhooks', 'webhook_deliveries', 'notification_preferences',
      'specialties', 'subscriptions', 'subscription_invoices', 'tenant_features', 'tenant_usage',
      'user_consents', 'phi_access_log', 'encryption_keys'
    ])
  LOOP
    SELECT relrowsecurity, relforcerowsecurity
      INTO rls, forced
      FROM pg_class WHERE relname = tbl;
    SELECT count(*) INTO policies
      FROM pg_policies WHERE tablename = tbl AND polname = 'tenant_isolation';

    INSERT INTO _rls_audit (table_name, rls_enabled, rls_forced, policy_count)
    VALUES (tbl, COALESCE(rls, false), COALESCE(forced, false), policies);

    IF NOT COALESCE(rls, false) OR NOT COALESCE(forced, false) OR policies = 0 THEN
      RAISE WARNING 'Table % may not be fully protected: rls=%, forced=%, policies=%',
        tbl, rls, forced, policies;
    END IF;
  END LOOP;
END $$;

-- 4. Verify that the validate_tenant_context trigger function is up to date
CREATE OR REPLACE FUNCTION validate_tenant_context()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tenant_id IS DISTINCT FROM current_setting('app.tenant_id', true) THEN
    RAISE EXCEPTION 'RLS violation: tenant_id % does not match session context %',
      NEW.tenant_id, current_setting('app.tenant_id', true);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Add _rls_audit summary entry
INSERT INTO _rls_audit (table_name, rls_enabled, rls_forced, policy_count)
VALUES ('__AUDIT_COMPLETE__', true, true, 0);

COMMIT;
