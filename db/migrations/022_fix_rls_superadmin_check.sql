-- 022: Fix RLS WITH CHECK for superadmin with tenant_id=NULL
-- The USING clause allows reading superadmin rows with tenant_id IS NULL,
-- but the WITH CHECK clause did not allow inserting them.
-- This adds the same superadmin bypass to WITH CHECK.

DROP POLICY IF EXISTS tenant_isolation ON users;

CREATE POLICY tenant_isolation ON users
  USING (
    tenant_id = COALESCE(current_setting('app.tenant_id', true), 'default')::text
    OR (role = 'superadmin' AND tenant_id IS NULL)
  )
  WITH CHECK (
    tenant_id = COALESCE(current_setting('app.tenant_id', true), 'default')::text
    OR (role = 'superadmin' AND tenant_id IS NULL)
  );
