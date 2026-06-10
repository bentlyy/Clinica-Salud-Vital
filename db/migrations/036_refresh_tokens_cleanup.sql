-- Migration: Scheduled cleanup for expired tokens, audit logs, and idempotency keys
-- Run periodically via cron (e.g., daily at 3 AM)
-- These operations are safe to run repeatedly (idempotent)

BEGIN;

-- Cleanup expired refresh tokens older than 90 days
DELETE FROM refresh_tokens WHERE expires_at < NOW() - INTERVAL '90 days';

-- Cleanup old audit logs (keep 1 year)
DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '1 year';

-- Cleanup old idempotency keys
DELETE FROM idempotency_keys WHERE expires_at < NOW();

-- Cleanup old _rls_audit entries
DELETE FROM _rls_audit WHERE checked_at < NOW() - INTERVAL '90 days';

COMMIT;
