-- 010: Change lab_areas.code and lab_tests.code from global UNIQUE to per-tenant UNIQUE
-- Root cause: ON CONFLICT (tenant_id, code) in admin.seed.ts fails because
-- the actual constraints are global UNIQUE on (code) alone, not composite (tenant_id, code).
-- This crashes the seed during clinica-norte, preventing clinica-sur from being created.
-- FIX: All DDL inside DO blocks so pool.query() executes everything atomically.

-- ── lab_areas ────────────────────────────────────────────────────────────────
DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'lab_areas'::regclass AND contype = 'u'
      AND pg_get_constraintdef(oid) LIKE '%(code)%'
      AND cardinality(conkey) = 1
  LOOP
    EXECUTE format('ALTER TABLE lab_areas DROP CONSTRAINT %I', rec.conname);
    RAISE NOTICE 'Dropped global UNIQUE constraint % on lab_areas.code', rec.conname;
  END LOOP;

  DROP INDEX IF EXISTS lab_areas_tenant_code_unique;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conrelid = 'lab_areas'::regclass
      AND contype = 'u' AND conname = 'lab_areas_tenant_code_unique'
  ) THEN
    ALTER TABLE lab_areas ADD CONSTRAINT lab_areas_tenant_code_unique UNIQUE (tenant_id, code);
    RAISE NOTICE 'Added per-tenant UNIQUE constraint on lab_areas(tenant_id, code)';
  END IF;
END $$;

-- ── lab_tests ────────────────────────────────────────────────────────────────
DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'lab_tests'::regclass AND contype = 'u'
      AND pg_get_constraintdef(oid) LIKE '%(code)%'
      AND cardinality(conkey) = 1
  LOOP
    EXECUTE format('ALTER TABLE lab_tests DROP CONSTRAINT %I', rec.conname);
    RAISE NOTICE 'Dropped global UNIQUE constraint % on lab_tests.code', rec.conname;
  END LOOP;

  DROP INDEX IF EXISTS lab_tests_tenant_code_unique;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conrelid = 'lab_tests'::regclass
      AND contype = 'u' AND conname = 'lab_tests_tenant_code_unique'
  ) THEN
    ALTER TABLE lab_tests ADD CONSTRAINT lab_tests_tenant_code_unique UNIQUE (tenant_id, code);
    RAISE NOTICE 'Added per-tenant UNIQUE constraint on lab_tests(tenant_id, code)';
  END IF;
END $$;
