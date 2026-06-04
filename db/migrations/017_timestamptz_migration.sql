-- Migration: Convert all TIMESTAMP columns to TIMESTAMPTZ
-- Uses dynamic SQL to skip columns that don't exist (handles schema drift)

DO $$
DECLARE
  rec RECORD;
  col_type TEXT;
BEGIN
  FOR rec IN (
    SELECT * FROM (VALUES
      ('public', 'users', 'blocked_until'),
      ('public', 'users', 'created_at'),
      ('public', 'users', 'last_login_at'),
      ('public', 'bookings', 'created_at'),
      ('public', 'clinical_records', 'created_at'),
      ('public', 'clinical_records', 'updated_at'),
      ('public', 'prescriptions', 'created_at'),
      ('public', 'cie10_catalog', 'created_at'),
      ('public', 'audit_logs', 'created_at'),
      ('public', 'invoices', 'issued_at'),
      ('public', 'invoices', 'paid_at'),
      ('public', 'invoices', 'created_at'),
      ('public', 'invoices', 'updated_at'),
      ('public', 'invoice_items', 'created_at'),
      ('public', 'payments', 'paid_at'),
      ('public', 'payments', 'payment_date'),
      ('public', 'payments', 'created_at'),
      ('public', 'insurance_claims', 'submitted_at'),
      ('public', 'insurance_claims', 'resolved_at'),
      ('public', 'insurance_claims', 'created_at'),
      ('public', 'insurance_claims', 'updated_at'),
      ('public', 'lab_tests', 'created_at'),
      ('public', 'lab_tests', 'updated_at'),
      ('public', 'lab_requests', 'requested_at'),
      ('public', 'lab_requests', 'completed_at'),
      ('public', 'lab_requests', 'collected_at'),
      ('public', 'lab_requests', 'created_at'),
      ('public', 'lab_requests', 'updated_at'),
      ('public', 'lab_request_items', 'completed_at'),
      ('public', 'lab_request_items', 'created_at'),
      ('public', 'permissions', 'created_at'),
      ('public', 'role_permissions', 'created_at'),
      ('public', 'user_permissions', 'created_at'),
      ('public', 'user_permissions', 'expires_at'),
      ('public', 'ml_prediction_history', 'prediction_date'),
      ('public', 'ml_model_metrics', 'trained_at'),
      ('public', 'ml_demand_forecast', 'generated_at'),
      ('public', 'refresh_tokens', 'expires_at'),
      ('public', 'refresh_tokens', 'created_at'),
      ('public', 'webhooks', 'created_at'),
      ('public', 'webhooks', 'updated_at'),
      ('public', 'webhook_deliveries', 'created_at'),
      ('public', 'tenants', 'created_at'),
      ('public', 'tenants', 'updated_at'),
      ('public', 'specialties', 'created_at'),
      ('public', 'plans', 'created_at'),
      ('public', 'plans', 'updated_at'),
      ('public', 'subscriptions', 'current_period_start'),
      ('public', 'subscriptions', 'current_period_end'),
      ('public', 'subscriptions', 'trial_end'),
      ('public', 'subscriptions', 'canceled_at'),
      ('public', 'subscriptions', 'created_at'),
      ('public', 'subscriptions', 'updated_at'),
      ('public', 'subscription_invoices', 'period_start'),
      ('public', 'subscription_invoices', 'period_end'),
      ('public', 'subscription_invoices', 'paid_at'),
      ('public', 'subscription_invoices', 'created_at'),
      ('public', 'tenant_features', 'created_at'),
      ('public', 'tenant_usage', 'created_at')
    ) AS t(schema_name, table_name, column_name)

    WHERE EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = t.schema_name
        AND table_name = t.table_name
    )
    AND EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = t.schema_name
        AND table_name = t.table_name
        AND column_name = t.column_name
    )
    AND EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = t.schema_name
        AND table_name = t.table_name
        AND column_name = t.column_name
        AND data_type NOT IN ('timestamp with time zone', 'timestamptz')
    )
  ) LOOP
    EXECUTE format(
      'ALTER TABLE %I.%I ALTER COLUMN %I TYPE TIMESTAMPTZ USING %I AT TIME ZONE ''UTC''',
      rec.schema_name, rec.table_name, rec.column_name, rec.column_name
    );
  END LOOP;
END $$;
