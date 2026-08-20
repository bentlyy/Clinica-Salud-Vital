-- ============================================================
-- 020: Register app.tenant_id GUC for PostgreSQL RLS
-- ============================================================
-- Problem: Oracle Cloud PostgreSQL + PgBouncer reject custom GUC
--          parameters set via SET SESSION. This migration:
--   1. Registers app.tenant_id as a known GUC for the clinic_app role
--   2. Creates set_tenant_id() function using set_config() (native PG,
--      works through PgBouncer because it's a SQL function call,
--      not a protocol-level SET command)
--   3. Uses is_local=false (session-scoped) so tenant_id persists
--      across queries in the same request
-- ============================================================

-- 1. Register GUC for the application role (best-effort)
--    ALTER ROLE ... SET tells PostgreSQL this is a valid parameter.
--    This may fail if: role doesn't exist yet, or insufficient privileges.
--    Both cases are non-fatal — set_config() still works without this.
DO $$
BEGIN
  ALTER ROLE clinic_app SET app.tenant_id = 'default';
  RAISE NOTICE 'Registered app.tenant_id GUC for role clinic_app';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'ALTER ROLE skipped (code: %, msg: %). set_config() still works.', SQLSTATE, SQLERRM;
END $$;

-- 2. Create the set_tenant_id() function
--    Uses set_config() which is a built-in PG function that calls
--    the GUC system internally. Unlike raw SET, this works through
--    PgBouncer and connection poolers because it's a SELECT statement,
--    not a protocol-level SET command.
--    is_local=false means session-scoped: persists for all queries
--    on this connection. The middleware calls this per-request to
--    reset the tenant context.
CREATE OR REPLACE FUNCTION set_tenant_id(p_tenant_id TEXT)
RETURNS void AS $$
BEGIN
  PERFORM set_config('app.tenant_id', p_tenant_id, false);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION set_tenant_id IS 'Sets app.tenant_id for the session. Called by tenant middleware for RLS isolation.';

-- 3. Verify the GUC is accessible
DO $$
DECLARE
  v_result TEXT;
BEGIN
  PERFORM set_config('app.tenant_id', 'test', false);
  v_result := current_setting('app.tenant_id', true);
  IF v_result = 'test' THEN
    RAISE NOTICE 'app.tenant_id GUC verified successfully';
  ELSE
    RAISE WARNING 'app.tenant_id GUC verification failed, got: %', v_result;
  END IF;
END $$;
