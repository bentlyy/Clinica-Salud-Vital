-- 047: Schema reconciliation — align column definitions between init.sql and migrations

BEGIN;

-- 1. invoices.amount: unify to NUMERIC(10,2) NOT NULL
-- DECIMAL and NUMERIC are equivalent in PostgreSQL, but ensure consistency
ALTER TABLE invoices ALTER COLUMN amount TYPE NUMERIC(10, 2);
ALTER TABLE invoices ALTER COLUMN amount SET NOT NULL;

-- 2. payments.method: drop if still exists (should have been dropped by migration 021)
ALTER TABLE payments DROP COLUMN IF EXISTS method;

-- 3. lab_tests.price: unify to NUMERIC(10,2) NOT NULL DEFAULT 0
UPDATE lab_tests SET price = 0 WHERE price IS NULL;
ALTER TABLE lab_tests ALTER COLUMN price TYPE NUMERIC(10, 2);
ALTER TABLE lab_tests ALTER COLUMN price SET NOT NULL;
ALTER TABLE lab_tests ALTER COLUMN price SET DEFAULT 0;

-- 4. invoice_items.description: unify to TEXT (migration 003 used VARCHAR(255))
ALTER TABLE invoice_items ALTER COLUMN description TYPE TEXT;

COMMIT;
