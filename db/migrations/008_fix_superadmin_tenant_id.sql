-- Permitir tenant_id=NULL en users para superadmin cross-clinic
ALTER TABLE users ALTER COLUMN tenant_id DROP NOT NULL;

-- Eliminar índice único compuesto que impide emails duplicados entre clínicas
DROP INDEX IF EXISTS idx_users_tenant_email;
