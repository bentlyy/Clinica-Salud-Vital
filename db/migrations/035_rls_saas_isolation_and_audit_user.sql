-- ============================================================
-- 035: RLS en SaaS/onboarding + user_id real en auditoría
-- ============================================================
-- NOTA DE NUMERACIÓN: renumerada desde 032 para no colisionar con la
-- migración 032_amg_sso.sql ya aplicada en producción (Vitaria/Render).
--   Prod _migrations: ... 031, 032_amg_sso, 033_rls_hardening,
--                      034_tenant_rls_indexes.
--   Este repo:        ... 031, 035 (este), 036.
-- El runner (src/app.ts) aplica por NOMBRE de archivo, así que un número
-- compartido con otro nombre se re-aplicaría en prod. Al renumerar se evita.
--
-- B1: siete tablas con tenant_id quedaban expuestas cross-tenant porque
--     sus políticas eran permisivas (authenticated_read USING(true),
--     restrict_writes USING(current_setting('app.tenant_id') IS NOT NULL)),
--     o porque nunca se activó RLS (specialties, tenant_onboarding,
--     onboarding_documents). Se sustituyen por la política tenant_isolation
--     estándar del proyecto (mismo patrón COALESCE que 021_fix_rls_for_render).
--
-- M2: los triggers de auditoría escribían audit_logs.user_id = NULL. Ahora
--     leen el usuario autenticado desde el GUC app.user_id, que el wrapper
--     de src/shared/db.ts setea por query desde el contexto async del
--     request (userContext, alimentado por el auth middleware).
--
-- Idempotente: se puede re-ejecutar sin error. Las filas escritas por los
-- triggers siguen sin hash; la cadena HMAC la calcula la aplicación
-- (logAction / rechainAuditLogs) — ver src/modules/audit/audit.service.ts.
-- ============================================================

-- 1. Tablas SaaS con tenant_id: reemplazar las políticas permisivas
DO $$
DECLARE
  tbl TEXT;
  saas_tables TEXT[] := ARRAY[
    'subscriptions', 'subscription_invoices', 'tenant_features', 'tenant_usage'
  ];
BEGIN
  FOREACH tbl IN ARRAY saas_tables LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = tbl
    ) THEN
      EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
      EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', tbl);
      EXECUTE format('DROP POLICY IF EXISTS authenticated_read ON %I', tbl);
      EXECUTE format('DROP POLICY IF EXISTS restrict_writes ON %I', tbl);
      EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', tbl);
      EXECUTE format(
        'CREATE POLICY tenant_isolation ON %I
         USING (tenant_id = COALESCE(current_setting(''app.tenant_id'', true), ''default'')::text)
          WITH CHECK (tenant_id = COALESCE(current_setting(''app.tenant_id'', true), ''default'')::text)',
        tbl
      );
      RAISE NOTICE '035: RLS tenant_isolation aplicado en %', tbl;
    END IF;
  END LOOP;
END $$;

-- 2. Tablas que nunca tuvieron RLS (fuga por ausencia de política)
DO $$
DECLARE
  tbl TEXT;
  unguarded_tables TEXT[] := ARRAY[
    'specialties', 'tenant_onboarding', 'onboarding_documents'
  ];
BEGIN
  FOREACH tbl IN ARRAY unguarded_tables LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = tbl
    ) THEN
      EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
      EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', tbl);
      EXECUTE format('DROP POLICY IF EXISTS authenticated_read ON %I', tbl);
      EXECUTE format('DROP POLICY IF EXISTS restrict_writes ON %I', tbl);
      EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', tbl);
      EXECUTE format(
        'CREATE POLICY tenant_isolation ON %I
         USING (tenant_id = COALESCE(current_setting(''app.tenant_id'', true), ''default'')::text)
          WITH CHECK (tenant_id = COALESCE(current_setting(''app.tenant_id'', true), ''default'')::text)',
        tbl
      );
      RAISE NOTICE '035: RLS activado por primera vez en %', tbl;
    END IF;
  END LOOP;
END $$;

-- 3. Triggers de auditoría: sellar user_id desde el GUC app.user_id
CREATE OR REPLACE FUNCTION audit_security_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO audit_logs (action, resource_type, resource_id, old_values, tenant_id, user_id, created_at)
    VALUES ('security_delete', TG_TABLE_NAME, OLD.id,
            to_jsonb(OLD) - 'password' - 'totp_secret',
            COALESCE(OLD.tenant_id, 'system'),
            NULLIF(current_setting('app.user_id', true), '')::int, NOW());
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.password IS DISTINCT FROM NEW.password
       OR OLD.role IS DISTINCT FROM NEW.role
       OR OLD.active IS DISTINCT FROM NEW.active
       OR OLD.blocked_until IS DISTINCT FROM NEW.blocked_until
       OR OLD.totp_enabled IS DISTINCT FROM NEW.totp_enabled THEN
      INSERT INTO audit_logs (action, resource_type, resource_id, old_values, new_values, tenant_id, user_id, created_at)
      VALUES ('security_update', TG_TABLE_NAME, NEW.id,
              jsonb_build_object(
                'password_changed', OLD.password IS DISTINCT FROM NEW.password,
                'role_changed', OLD.role IS DISTINCT FROM NEW.role,
                'active_changed', OLD.active IS DISTINCT FROM NEW.active,
                'blocked_changed', OLD.blocked_until IS DISTINCT FROM NEW.blocked_until,
                'totp_changed', OLD.totp_enabled IS DISTINCT FROM NEW.totp_enabled
              ),
              to_jsonb(NEW) - 'password' - 'totp_secret',
              COALESCE(NEW.tenant_id, 'system'),
              NULLIF(current_setting('app.user_id', true), '')::int, NOW());
    END IF;
    RETURN NEW;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION audit_phi_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO audit_logs (action, resource_type, resource_id, old_values, tenant_id, user_id, created_at)
    VALUES ('phi_delete', TG_TABLE_NAME, OLD.id,
            jsonb_build_object(
              'id', OLD.id,
              'patient_id', OLD.patient_id,
              'doctor_id', OLD.doctor_id,
              'created_at', OLD.created_at
            ),
            COALESCE(OLD.tenant_id, 'system'),
            NULLIF(current_setting('app.user_id', true), '')::int, NOW());
    RETURN OLD;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (action, resource_type, resource_id, new_values, tenant_id, user_id, created_at)
    VALUES ('phi_create', TG_TABLE_NAME, NEW.id,
            jsonb_build_object(
              'id', NEW.id,
              'patient_id', NEW.patient_id,
              'doctor_id', NEW.doctor_id,
              'created_at', NEW.created_at
            ),
            COALESCE(NEW.tenant_id, 'system'),
            NULLIF(current_setting('app.user_id', true), '')::int, NOW());
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_logs (action, resource_type, resource_id, old_values, new_values, tenant_id, user_id, created_at)
    VALUES ('phi_update', TG_TABLE_NAME, NEW.id,
            jsonb_build_object('id', OLD.id, 'status', OLD.status),
            jsonb_build_object('id', NEW.id, 'status', NEW.status),
            COALESCE(NEW.tenant_id, 'system'),
            NULLIF(current_setting('app.user_id', true), '')::int, NOW());
    RETURN NEW;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Verificación (no falla si algo está ausente; deja rastro en los logs)
DO $$
DECLARE
  n_policies INT;
BEGIN
  SELECT COUNT(*) INTO n_policies
  FROM pg_policies
  WHERE schemaname = 'public'
    AND policyname = 'tenant_isolation'
    AND tablename IN (
      'subscriptions', 'subscription_invoices', 'tenant_features',
      'tenant_usage', 'specialties', 'tenant_onboarding', 'onboarding_documents'
    );
  RAISE NOTICE '035: políticas tenant_isolation presentes en % de 7 tablas objetivo', n_policies;
END $$;
