-- 054: Eliminar RLS de todas las tablas
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'users', 'doctors', 'bookings', 'clinical_records', 'invoices',
      'lab_requests', 'audit_logs', 'subscriptions', 'refresh_tokens',
      'doctor_availability', 'doctor_exceptions', 'guest_bookings',
      'lab_tests', 'lab_request_items', 'invoice_items', 'payments',
      'insurance_claims', 'prescriptions', 'cie10_catalog',
      'notification_preferences', 'user_consents', 'phi_access_log',
      'encryption_keys', 'data_retention_policy', 'tenant_usage',
      'tenant_features', 'subscription_invoices', 'plans',
      'webhook_deliveries', 'webhooks', 'permissions', 'role_permissions',
      'user_permissions', '_migrations', '_schema_meta'
    ])
  LOOP
    EXECUTE format('ALTER TABLE %I DISABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('ALTER TABLE %I NO FORCE ROW LEVEL SECURITY', tbl);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_policy ON %I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS superadmin_bypass ON %I', tbl);
  END LOOP;
END $$;
