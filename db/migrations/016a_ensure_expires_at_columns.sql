-- Migration: Ensure expires_at columns exist before 017_timestamptz_migration.sql
-- Fixes schema drift: init.sql creates user_permissions without expires_at,
-- and 005_rbac.sql's CREATE TABLE IF NOT EXISTS skips because table exists.
-- Safe to run repeatedly (uses information_schema checks).

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_permissions' AND column_name = 'expires_at'
  ) THEN
    ALTER TABLE user_permissions ADD COLUMN expires_at TIMESTAMP;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'refresh_tokens' AND column_name = 'expires_at'
  ) THEN
    ALTER TABLE refresh_tokens ADD COLUMN expires_at TIMESTAMP NOT NULL DEFAULT (NOW() + INTERVAL '30 days');
  END IF;
END $$;
