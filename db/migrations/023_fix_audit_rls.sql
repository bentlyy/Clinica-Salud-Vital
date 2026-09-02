-- ============================================================
-- 023: Fix audit triggers broken by FORCE RLS on audit_logs
-- ============================================================
-- Problem
-- -------
-- audit_logs is created with ENABLE ROW LEVEL SECURITY and FORCE ROW
-- LEVEL SECURITY (db/security.sql).
--
-- The audit triggers (audit_security_changes, audit_phi_changes) are
-- SECURITY DEFINER and run as the table owner (clinic_user). Because
-- FORCE RLS is set, the OWNER is ALSO subject to RLS.
--
-- The tenant_isolation policy on audit_logs enforces:
--   WITH CHECK (tenant_id = COALESCE(current_setting('app.tenant_id'), 'default'))
--
-- The triggers insert audit rows using:
--   COALESCE(NEW.tenant_id, 'system')   -- superadmin row -> tenant_id NULL -> 'system'
--
-- When the inserted tenant differs from the session's app.tenant_id
-- (most notably 'system' for the cross-tenant superadmin), RLS rejects
-- the INSERT and the WHOLE operation fails. E.g. rotating a superadmin
-- password aborts the UPDATE with:
--   "new row violates row-level security policy for table audit_logs"
--
-- Fix
-- ----
-- Add a permissive INSERT policy on audit_logs that also allows
-- tenant_id = 'system' (used for cross-tenant superadmin audits) and
-- the current session tenant. PostgreSQL combines permissive policies
-- with OR, so the INSERT succeeds while SELECT (reads) stays isolated
-- by the existing tenant_isolation policy.
--
-- audit integrity is additionally protected by the HMAC chain
-- (audit.service.ts) verified periodically (audit-integrity.job.ts).

DROP POLICY IF EXISTS audit_write ON audit_logs;

CREATE POLICY audit_write ON audit_logs
  FOR INSERT
  WITH CHECK (
    tenant_id = COALESCE(current_setting('app.tenant_id', true), 'default')::text
    OR tenant_id = 'system'
  );
