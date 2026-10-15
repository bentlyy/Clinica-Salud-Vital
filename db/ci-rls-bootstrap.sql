-- ============================================================
-- CI bootstrap — RLS isolation test
-- ============================================================
-- Purpose: prepare an EPHEMERAL database (GitHub Actions) to run
-- tests/integration/rls-isolation.test.js against real RLS.
--
-- Run order:
--   1. db/init.sql
--   2. db/migrations/*.sql   (creates the production-like tenant_isolation
--                             and restrict_writes policies)
--   3. THIS FILE             (enables RLS + creates the app role + grants)
--   4. db/ci-seed-rls.sql    (two tenants with data)
--
-- This is NOT used in production. Production RLS is enabled by
-- db/security.sql. It exists because security.sql is not runnable on a
-- fresh database (it REVOKEs functions it defines later) and hardcodes the
-- legacy role `clinic_app`; reconciling that drift is task 1.4 of the plan.

-- 1. Application role (LOGIN, NOT BYPASSRLS -> subject to RLS)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'clinic_app') THEN
    CREATE ROLE clinic_app LOGIN NOINHERIT;
  END IF;
END $$;

-- 2. Enable + FORCE RLS on every table that has an isolation policy.
--    Deriving the list from pg_policies keeps this drift-resistant: any
--    policy created by the migrations is enforced automatically.
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT DISTINCT tablename FROM pg_policies
    WHERE schemaname = 'public'
      AND policyname IN ('tenant_isolation', 'restrict_writes', 'audit_write')
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', r.tablename);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', r.tablename);
  END LOOP;
END $$;

-- 3. Least-privilege grants for the app role
GRANT USAGE ON SCHEMA public TO clinic_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO clinic_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO clinic_app;

-- Register the GUC so current_setting('app.tenant_id', false) never throws
-- (the test sets it per-session anyway).
ALTER ROLE clinic_app SET app.tenant_id = 'default';
ALTER ROLE clinic_app SET statement_timeout = '30s';
