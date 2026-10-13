-- ============================================================
-- 033: RLS hardening — cierra fugas cross-tenant (auditoría 2026-10-13)
-- ============================================================
-- Contexto (hallazgos 🔴):
--   1) Tablas con tenant_id SIN Row Level Security:
--        specialties, tenant_onboarding, onboarding_documents
--      Todas son propiedad de clinic_user (el rol con el que se conecta
--      la app). Sin `FORCE ROW LEVEL SECURITY`, el OWNER (la propia app)
--      bypasea RLS por completo -> fuga cross-tenant total.
--   2) Tablas SaaS con una única política que permite leer/escribir TODOS
--      los tenants (migración 021 dejó `restrict_writes` con
--      USING (current_setting('app.tenant_id') IS NOT NULL)):
--        plans, subscriptions, subscription_invoices,
--        tenant_features, tenant_usage
--
-- Objetivo:
--   - Aislar por tenant TODAS las tablas con columna tenant_id.
--   - plans es catálogo GLOBAL: lectura para todos, escritura restringida.
--   - Los accesos cross-tenant (panel superadmin, facturación/webhooks)
--     deben usar el pool BYPASSRLS (DATABASE_URL_SUPERADMIN).
--
-- Notas:
--   - Idempotente: puede re-ejecutarse sin efectos colaterales.
--   - No se incluye clinical_templates: no existe en producción
--     (init.sql no usa IF NOT EXISTS y no hay migración que la cree).
--   - Se respeta el patrón COALESCE(..., 'default') de la migración 021
--     para compatibilidad con PostgreSQL gestionado (Render/PgBouncer).
-- ============================================================

-- ── 1. Tablas con tenant_id sin RLS: aislar por tenant ───────
DO $$
DECLARE
  tbl TEXT;
  tenant_tables TEXT[] := ARRAY['specialties', 'tenant_onboarding', 'onboarding_documents'];
BEGIN
  FOREACH tbl IN ARRAY tenant_tables LOOP
    IF to_regclass('public.' || quote_ident(tbl)) IS NULL THEN
      RAISE NOTICE '033: tabla % no existe, se omite', tbl;
      CONTINUE;
    END IF;

    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', tbl);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS authenticated_read ON %I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS restrict_writes ON %I', tbl);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I
         USING (tenant_id = COALESCE(current_setting(''app.tenant_id'', true), ''default'')::text)
          WITH CHECK (tenant_id = COALESCE(current_setting(''app.tenant_id'', true), ''default'')::text)',
      tbl
    );
    RAISE NOTICE '033: RLS + FORCE + tenant_isolation aplicado a %', tbl;
  END LOOP;
END $$;

-- ── 2. Tablas SaaS: acceso aislado por tenant ────────────────
-- Reemplaza la política que permitía leer/escribir todos los tenants.
-- Mismo patrón tenant_isolation que el resto del esquema:
--   - SELECT/INSERT/UPDATE/DELETE permitidos sólo para la fila del tenant
--     de la sesión (current_setting('app.tenant_id')).
--   - Los procesos cross-tenant usan el pool BYPASSRLS (superadmin).
DO $$
DECLARE
  tbl TEXT;
  saas_tables TEXT[] := ARRAY[
    'subscriptions', 'subscription_invoices', 'tenant_features', 'tenant_usage'
  ];
BEGIN
  FOREACH tbl IN ARRAY saas_tables LOOP
    IF to_regclass('public.' || quote_ident(tbl)) IS NULL THEN
      RAISE NOTICE '033: tabla % no existe, se omite', tbl;
      CONTINUE;
    END IF;

    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', tbl);
    EXECUTE format('DROP POLICY IF EXISTS authenticated_read ON %I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS restrict_writes ON %I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS tenant_read ON %I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', tbl);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I
         USING (tenant_id = COALESCE(current_setting(''app.tenant_id'', true), ''default'')::text)
          WITH CHECK (tenant_id = COALESCE(current_setting(''app.tenant_id'', true), ''default'')::text)',
      tbl
    );
    RAISE NOTICE '033: SaaS tenant_isolation aplicado a %', tbl;
  END LOOP;
END $$;

-- ── 3. plans: catálogo global (lectura total, escritura restringida) ──
DO $$
BEGIN
  IF to_regclass('public.plans') IS NULL THEN
    RAISE NOTICE '033: plans no existe, se omite';
    RETURN;
  END IF;

  ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
  ALTER TABLE plans FORCE ROW LEVEL SECURITY;

  DROP POLICY IF EXISTS authenticated_read ON plans;
  DROP POLICY IF EXISTS restrict_writes ON plans;
  DROP POLICY IF EXISTS tenant_isolation ON plans;

  -- lectura para todos (catálogo de planes), escritura sólo con BYPASSRLS
  CREATE POLICY authenticated_read ON plans FOR SELECT USING (true);
  CREATE POLICY restrict_writes ON plans FOR ALL USING (false) WITH CHECK (false);
  RAISE NOTICE '033: plans lectura global + escritura restringida';
END $$;

-- ── 4. GRANTs defensivos (entornos donde el rol de app no es owner) ──
DO $$
DECLARE
  rol   TEXT;
  tbl   TEXT;
  roles TEXT[] := ARRAY['clinic_app', 'clinic_user'];
  tables TEXT[] := ARRAY[
    'specialties', 'tenant_onboarding', 'onboarding_documents', 'plans',
    'subscriptions', 'subscription_invoices', 'tenant_features', 'tenant_usage'
  ];
BEGIN
  FOREACH rol IN ARRAY roles LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = rol) THEN
      CONTINUE;
    END IF;
    EXECUTE format('GRANT USAGE ON SCHEMA public TO %I', rol);
    FOREACH tbl IN ARRAY tables LOOP
      IF to_regclass('public.' || quote_ident(tbl)) IS NULL THEN
        CONTINUE;
      END IF;
      EXECUTE format(
        'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE %I TO %I', tbl, rol
      );
    END LOOP;
  END LOOP;
END $$;

-- ── 5. Verificación ─────────────────────────────────────────
DO $$
DECLARE
  tbl     TEXT;
  missing TEXT := '';
  targets TEXT[] := ARRAY[
    'specialties', 'tenant_onboarding', 'onboarding_documents', 'plans',
    'subscriptions', 'subscription_invoices', 'tenant_features', 'tenant_usage'
  ];
BEGIN
  FOREACH tbl IN ARRAY targets LOOP
    IF to_regclass('public.' || quote_ident(tbl)) IS NULL THEN
      CONTINUE;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = tbl
        AND c.relrowsecurity AND c.relforcerowsecurity
    ) THEN
      missing := missing || tbl || ' ';
    END IF;
  END LOOP;

  IF missing = '' THEN
    RAISE NOTICE '033: verificación OK — RLS + FORCE activos en todas las tablas objetivo';
  ELSE
    RAISE WARNING '033: tablas sin RLS/FORCE: %', missing;
  END IF;
END $$;
