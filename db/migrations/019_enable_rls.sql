-- Migration: Enable Row Level Security on all tenant-scoped tables
-- RLS ensures that even if a query omits WHERE tenant_id = ?, PostgreSQL rejects it.
-- Policy uses app.tenant_id session parameter (set by tenant middleware).
-- If parameter is not set (superadmin), allows all access.

-- Helper: alter table to enable RLS
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
      'specialties', 'subscriptions', 'subscription_invoices', 'tenant_features', 'tenant_usage'
    ])
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', tbl);
  END LOOP;
END $$;

-- Policies: if app.tenant_id is set, filter by it; if not set (superadmin), allow all
-- Using current_setting with true flag to avoid error when not set

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
      'specialties'
    ])
  LOOP
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I FOR ALL USING (
        NULLIF(current_setting(''app.tenant_id'', true), '''') IS NOT NULL
        AND tenant_id = NULLIF(current_setting(''app.tenant_id'', true), '''')
      )',
      tbl
    );
  END LOOP;
END $$;

-- SaaS tables (subscriptions, etc.) use same pattern
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'subscriptions', 'subscription_invoices', 'tenant_features', 'tenant_usage'
    ])
  LOOP
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I FOR ALL USING (
        NULLIF(current_setting(''app.tenant_id'', true), '''') IS NOT NULL
        AND tenant_id = NULLIF(current_setting(''app.tenant_id'', true), '''')
      )',
      tbl
    );
  END LOOP;
END $$;
