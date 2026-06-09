-- Migration: Eliminar bypass de RLS por string 'superadmin'
-- CRÍTICO: Cualquier conexión con SET SESSION app.tenant_id = 'superadmin' podía ver todos los datos
-- Ahora: usa rol real de PostgreSQL 'saas_superadmin' o app.tenant_id = NULL (conexión directa)

BEGIN;

-- 1. Recrear políticas RLS SIN el bypass de string mágico
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
    -- Nueva política: solo permite acceso si app.tenant_id = tenant_id del row
    -- Sin excepciones para strings mágicos
    -- El verdadero superadmin (rol PostgreSQL) puede ver todo via BYPASSRLS
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

-- 2. Crear rol de superadmin real para PostgreSQL (no por string)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'saas_superadmin') THEN
    CREATE ROLE saas_superadmin WITH LOGIN INHERIT;
  END IF;
END $$;

-- 3. Otorgar bypass RLS al rol superadmin real
ALTER ROLE saas_superadmin BYPASSRLS;

-- 4. Función helper para que la app.setTenantContext valide el tenant existe
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

-- 5. Actualizar función enforce_tenant_id para mejor mensaje de error
CREATE OR REPLACE FUNCTION enforce_tenant_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tenant_id IS NULL OR NEW.tenant_id = '' THEN
    NEW.tenant_id := NULLIF(current_setting('app.tenant_id', true), '');
    IF NEW.tenant_id IS NULL OR NEW.tenant_id = '' THEN
      RAISE EXCEPTION 'tenant_id es OBLIGATORIO. Debes ejecutar: SET SESSION app.tenant_id = ''<tenant_id>'' antes de insertar.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMIT;
