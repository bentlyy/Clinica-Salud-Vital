-- 032_amg_sso.sql
-- Migración a identidad SSO con el Core (@amg/platform).
--
-- Vitaria deja de autenticar con contraseñas propias y pasa a recibir la
-- identidad del Core. Solo se agregan las columnas de vínculo:
--
--   tenants.sso_org_id  -> organización del Core que corresponde al tenant
--   users.sso_sub       -> usuario del Core (claim `sub`) que corresponde al row
--
-- Idempotente: se puede re-aplicar sin efectos.

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS sso_org_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_tenants_sso_org_id
  ON tenants (sso_org_id)
  WHERE sso_org_id IS NOT NULL;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS sso_sub TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_sso_sub
  ON users (sso_sub)
  WHERE sso_sub IS NOT NULL;

COMMENT ON COLUMN tenants.sso_org_id IS 'SSO: id de la organización en el Core (@amg/platform). NULL = tenant aún sin vincular.';
COMMENT ON COLUMN users.sso_sub IS 'SSO: claim `sub` del usuario en el Core. NULL = cuenta local heredada.';
