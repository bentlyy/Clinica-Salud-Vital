-- Migration: Security enhancements - account lockout, token version, RLS WITH CHECK
-- Part of security remediation sprint

BEGIN;

-- Add failed_attempts and locked_until for account lockout
ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_attempts INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ;

-- Add token_version for invalidating all sessions on password change
ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version INTEGER DEFAULT 0;

-- Drop existing RLS policies and recreate WITH CHECK clause
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
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', tbl);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I FOR ALL USING (
        tenant_id = COALESCE(NULLIF(current_setting(''app.tenant_id'', true), ''), tenant_id)
      ) WITH CHECK (
        tenant_id = COALESCE(NULLIF(current_setting(''app.tenant_id'', true), ''), tenant_id)
      )',
      tbl
    );
  END LOOP;
END $$;

-- Add index on failed_attempts for lockout queries
CREATE INDEX IF NOT EXISTS idx_users_failed_attempts ON users (failed_attempts) WHERE failed_attempts > 0;

-- Fix duplicate columns: drop the redundant column, keep the canonical one
-- billing: is_active → canonical is active

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'is_active') THEN
    ALTER TABLE payments DROP COLUMN is_active;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'method') THEN
    ALTER TABLE payments DROP COLUMN method;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'insurance_claims' AND column_name = 'is_active') THEN
    ALTER TABLE insurance_claims DROP COLUMN is_active;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'insurance_claims' AND column_name = 'claim_amount') THEN
    ALTER TABLE insurance_claims RENAME COLUMN claim_amount TO amount;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoice_items' AND column_name = 'total_price') THEN
    ALTER TABLE invoice_items DROP COLUMN total_price;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoice_items' AND column_name = 'is_active') THEN
    ALTER TABLE invoice_items DROP COLUMN is_active;
  END IF;
END $$;

-- Ensure RUT UNIQUE constraint ignores formatting with functional index
DROP INDEX IF EXISTS idx_users_rut_clean;
CREATE INDEX IF NOT EXISTS idx_users_rut_clean ON users (REPLACE(REPLACE(REPLACE(rut, '.', ''), '-', ''), ' ', ''))
  WHERE rut IS NOT NULL;

-- Add UNIQUE constraint on invoice_number if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'invoices_invoice_number_key'
  ) THEN
    ALTER TABLE invoices ADD CONSTRAINT invoices_invoice_number_key UNIQUE (invoice_number);
  END IF;
END $$;

-- Add missing updated_at triggers
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'users', 'doctors', 'bookings', 'clinical_records', 'prescriptions',
      'invoices', 'payments', 'insurance_claims',
      'lab_tests', 'lab_requests', 'lab_request_items',
      'webhooks', 'webhook_deliveries'
    ])
  LOOP
    EXECUTE format(
      'CREATE OR REPLACE TRIGGER update_%I_updated_at
       BEFORE UPDATE ON %I
       FOR EACH ROW
       EXECUTE FUNCTION update_updated_at_column()',
      tbl, tbl
    );
  END LOOP;
END $$;

COMMIT;
