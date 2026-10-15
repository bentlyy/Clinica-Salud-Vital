-- ============================================================
-- 036: Normalización de políticas tenant_isolation
--      (compatibilidad Render/PgBouncer — usa COALESCE(...,'default'))
-- ============================================================
-- NOTA DE NUMERACIÓN: renumerada desde 033 para no colisionar con la
-- migración 033_rls_hardening.sql ya aplicada en producción. El runner
-- (src/app.ts) aplica por NOMBRE de archivo; renumerar evita re-aplicaciones.
--
-- CONTEXTO (decisión de diseño): la auditoría FND-B2 propuso políticas
-- fail-closed (sin fallback), pero producción retuvo DELIBERADAMENTE el
-- patrón COALESCE(current_setting('app.tenant_id', true), 'default') para
-- no romper Render/PgBouncer: si el GUC no llega a setearse en la conexión
-- que sirve la query, una política fail-closed devolvería CERO filas y la
-- app se vería vacía. Se prioriza la disponibilidad sobre el fail-closed.
--
-- Esta migración re-afirma el patrón estándar COALESCE (mismo que
-- 021_fix_rls_for_render.sql) sobre todas las tablas multi-tenant, de forma
-- idempotente. Sirve para converger el repo con prod y cubrir tablas
-- añadidas después de 021 (lab_*, booking_status_history, waitlist, ...).
--
-- La protección de aislamiento sigue vigente: el wrapper de src/shared/db.ts
-- setea app.tenant_id por query desde el contexto del request, por lo que el
-- fallback 'default' sólo se usa cuando NO hay contexto (seeds, migraciones,
-- jobs) — exactamente el comportamiento previo esperado.
--
-- Idempotente: se puede re-ejecutar sin error. Sólo toca las políticas
-- tenant_isolation; audit_write (audit_logs) y tenants se preservan tal cual.
-- ============================================================

-- 1. Tablas con tenant_id: política tenant_isolation estándar (COALESCE)
DO $$
DECLARE
  tbl TEXT;
  tenant_tables TEXT[] := ARRAY[
    'bookings', 'clinical_records', 'prescriptions', 'audit_logs',
    'invoices', 'invoice_items', 'payments', 'insurance_claims',
    'lab_areas', 'lab_tests', 'lab_requests', 'lab_request_items',
    'lab_samples', 'lab_qc_records', 'lab_equipment', 'lab_reagents',
    'lab_notifications', 'lab_result_history',
    'booking_series', 'booking_status_history', 'notifications',
    'waitlist', 'clinic_holidays', 'medical_history', 'user_sessions',
    'attachments', 'reports', 'webhook_subscriptions', 'webhook_deliveries',
    'ml_demand_forecast', 'doctor_availability', 'doctor_exceptions',
    'refresh_tokens', 'password_reset_tokens',
    'subscriptions', 'subscription_invoices', 'tenant_features', 'tenant_usage',
    'specialties', 'tenant_onboarding', 'onboarding_documents'
  ];
BEGIN
  FOREACH tbl IN ARRAY tenant_tables LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = tbl
    ) THEN
      EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', tbl);
      EXECUTE format(
        'CREATE POLICY tenant_isolation ON %I
         USING (tenant_id = COALESCE(current_setting(''app.tenant_id'', true), ''default'')::text)
          WITH CHECK (tenant_id = COALESCE(current_setting(''app.tenant_id'', true), ''default'')::text)',
        tbl
      );
      RAISE NOTICE '036: RLS tenant_isolation estándar en %', tbl;
    END IF;
  END LOOP;
END $$;

-- 2. users — superadmin puede verse entre tenants (tenant_id NULL)
DROP POLICY IF EXISTS tenant_isolation ON users;
CREATE POLICY tenant_isolation ON users
  USING (
    tenant_id = COALESCE(current_setting('app.tenant_id', true), 'default')::text
    OR (role = 'superadmin' AND tenant_id IS NULL)
  )
  WITH CHECK (
    tenant_id = COALESCE(current_setting('app.tenant_id', true), 'default')::text
  );

-- 3. doctors — sin bypass para nadie
DROP POLICY IF EXISTS tenant_isolation ON doctors;
CREATE POLICY tenant_isolation ON doctors
  USING (tenant_id = COALESCE(current_setting('app.tenant_id', true), 'default')::text)
  WITH CHECK (tenant_id = COALESCE(current_setting('app.tenant_id', true), 'default')::text);

-- 4. Verificación (no falla; deja rastro en logs)
DO $$
DECLARE
  non_coalesce INT;
BEGIN
  SELECT COUNT(*) INTO non_coalesce
  FROM pg_policies
  WHERE schemaname = 'public'
    AND policyname = 'tenant_isolation'
    AND COALESCE(qual, '') NOT LIKE '%COALESCE%'
    AND COALESCE(with_check, '') NOT LIKE '%COALESCE%';
  IF non_coalesce = 0 THEN
    RAISE NOTICE '036: todas las políticas tenant_isolation usan COALESCE (compat Render OK)';
  ELSE
    RAISE WARNING '036: % política(s) tenant_isolation NO usan COALESCE', non_coalesce;
  END IF;
END $$;
