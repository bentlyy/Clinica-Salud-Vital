-- Migration: Ensure expires_at columns exist on all tables that reference them
-- Fixes schema drift between init.sql (no expires_at) and migration 005
-- Safe to run repeatedly (uses IF NOT EXISTS / IF EXISTS checks)

DO $$ BEGIN
  -- user_permissions: created by init.sql without expires_at,
  -- but 005_rbac.sql's CREATE TABLE IF NOT EXISTS is skipped
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_permissions' AND column_name = 'expires_at'
  ) THEN
    ALTER TABLE user_permissions ADD COLUMN expires_at TIMESTAMP;
  END IF;

  -- refresh_tokens: created by 007_auth_webhooks_multitenant.sql
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'refresh_tokens' AND column_name = 'expires_at'
  ) THEN
    ALTER TABLE refresh_tokens ADD COLUMN expires_at TIMESTAMP NOT NULL DEFAULT (NOW() + INTERVAL '30 days');
  END IF;

  -- password_reset_tokens: created by 022_password_reset_and_security.sql
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'password_reset_tokens' AND column_name = 'expires_at'
  ) THEN
    ALTER TABLE password_reset_tokens ADD COLUMN expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '1 hour');
  END IF;
END $$;
