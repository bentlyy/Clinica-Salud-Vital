-- ============================================================
-- 020: Register app.tenant_id GUC for PostgreSQL RLS
-- ============================================================
-- Problem: Oracle Cloud PostgreSQL + PgBouncer reject custom GUC
--          parameters set via SET SESSION. This migration:
--   1. Registers app.tenant_id as a known GUC for the clinic_app role
--   2. Creates set_tenant_id() function using set_config() (native PG,
--      works through PgBouncer because it's a SQL function call,
--      not a protocol-level SET command)
--   3. Uses SET LOCAL (transaction-scoped) so tenant_id never leaks
--      across pooled connections
-- ============================================================

-- 1. Register GUC for the application role
--    ALTER ROLE ... SET tells PostgreSQL this is a valid parameter for the role.
--    This makes current_setting('app.tenant_id') work in RLS policies.
DO $$
BEGIN
  ALTER ROLE clinic_app SET app.tenant_id = 'default';
  RAISE NOTICE 'Registered app.tenant_id GUC for role clinic_app';
EXCEPTION WHEN undefined_object THEN
  -- Role doesn't exist yet (first deploy), skip silently
  RAISE NOTICE 'Role clinic_app not found, skipping GUC registration (will be created by security.sql)';
END $$;

-- 2. Create the set_tenant_id() function
--    Uses set_config() which is a built-in PG function that calls
--    the GUC system internally. Unlike raw SET, this works through
--    PgBouncer and connection poolers because it's a SELECT statement.
--    is_local = true means the value is scoped to the current transaction,
--    preventing tenant_id leakage across pooled connections.
CREATE OR REPLACE FUNCTION set_tenant_id(p_tenant_id TEXT)
RETURNS void AS $$
BEGIN
  PERFORM set_config('app.tenant_id', p_tenant_id, true);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION set_tenant_id IS 'Sets app.tenant_id for the current transaction. Used by tenant middleware for RLS isolation. is_local=true prevents leakage across pooled connections.';

-- 3. Verify the GUC is accessible
DO $$
DECLARE
  v_result TEXT;
BEGIN
  PERFORM set_config('app.tenant_id', 'test', true);
  v_result := current_setting('app.tenant_id', true);
  IF v_result = 'test' THEN
    RAISE NOTICE 'app.tenant_id GUC verified successfully';
  ELSE
    RAISE WARNING 'app.tenant_id GUC verification failed, got: %', v_result;
  END IF;
END $$;
