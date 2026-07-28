-- 010: Change lab_areas.code and lab_tests.code from global UNIQUE to per-tenant UNIQUE
-- Root cause: ON CONFLICT (tenant_id, code) in admin.seed.ts fails because
-- the actual constraints are global UNIQUE on (code) alone, not composite (tenant_id, code).
-- This crashes the seed during clinica-norte, preventing clinica-sur from being created.

-- ── lab_areas ────────────────────────────────────────────────────────────────
-- Drop global unique constraint on code (auto-named lab_areas_code_key)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'lab_areas'::regclass
      AND contype = 'u'
      AND pg_get_constraintdef(oid) LIKE '%(code)%'
      AND cardinality(conkey) = 1
  ) THEN
    EXECUTE (
      SELECT format('ALTER TABLE lab_areas DROP CONSTRAINT %s', conname)
      FROM pg_constraint
      WHERE conrelid = 'lab_areas'::regclass
        AND contype = 'u'
        AND pg_get_constraintdef(oid) LIKE '%(code)%'
        AND cardinality(conkey) = 1
      LIMIT 1
    );
    RAISE NOTICE 'Dropped global UNIQUE constraint on lab_areas.code';
  END IF;
END $$;

-- Add per-tenant unique constraint on (tenant_id, code)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'lab_areas'::regclass
      AND contype = 'u'
      AND conname = 'lab_areas_tenant_code_unique'
  ) THEN
    ALTER TABLE lab_areas ADD CONSTRAINT lab_areas_tenant_code_unique UNIQUE (tenant_id, code);
    RAISE NOTICE 'Added per-tenant UNIQUE constraint on lab_areas(tenant_id, code)';
  END IF;
END $$;

-- ── lab_tests ────────────────────────────────────────────────────────────────
-- Drop global unique constraint on code (auto-named lab_tests_code_key)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'lab_tests'::regclass
      AND contype = 'u'
      AND pg_get_constraintdef(oid) LIKE '%(code)%'
      AND cardinality(conkey) = 1
  ) THEN
    EXECUTE (
      SELECT format('ALTER TABLE lab_tests DROP CONSTRAINT %s', conname)
      FROM pg_constraint
      WHERE conrelid = 'lab_tests'::regclass
        AND contype = 'u'
        AND pg_get_constraintdef(oid) LIKE '%(code)%'
        AND cardinality(conkey) = 1
      LIMIT 1
    );
    RAISE NOTICE 'Dropped global UNIQUE constraint on lab_tests.code';
  END IF;
END $$;

-- Add per-tenant unique constraint on (tenant_id, code)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'lab_tests'::regclass
      AND contype = 'u'
      AND conname = 'lab_tests_tenant_code_unique'
  ) THEN
    ALTER TABLE lab_tests ADD CONSTRAINT lab_tests_tenant_code_unique UNIQUE (tenant_id, code);
    RAISE NOTICE 'Added per-tenant UNIQUE constraint on lab_tests(tenant_id, code)';
  END IF;
END $$;
