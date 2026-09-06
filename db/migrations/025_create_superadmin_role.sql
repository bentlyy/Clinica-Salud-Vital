-- ============================================================
-- 025: Crear rol clinic_superadmin con BYPASSRLS
-- ============================================================
-- Problema: El panel SuperAdmin muestra 0 para todos los tenants
-- excepto 'default' porque RLS (FORCE ROW LEVEL SECURITY) filtra
-- los datos por app.tenant_id que siempre queda en 'default' por
-- el connection pool.
--
-- Solución: Crear un rol dedicado con BYPASSRLS que el módulo
-- superadmin usa vía DATABASE_URL_SUPERADMIN en Render.
-- Este rol ve todas las filas sin importar la configuración de RLS.
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'clinic_superadmin') THEN
    EXECUTE 'CREATE ROLE clinic_superadmin LOGIN BYPASSRLS';
    RAISE NOTICE 'Role clinic_superadmin created';
  ELSE
    RAISE NOTICE 'Role clinic_superadmin already exists';
  END IF;
END $$;

-- Password: se setea via env var o manualmente
-- ALTER ROLE clinic_superadmin PASSWORD '....';

-- Permisos equivalentes a clinic_app (DML completo, sin DDL)
GRANT USAGE ON SCHEMA public TO clinic_superadmin;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO clinic_superadmin;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO clinic_superadmin;

-- Para futuras tablas
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO clinic_superadmin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO clinic_superadmin;

-- Seguridad: timeout de statements
ALTER ROLE clinic_superadmin SET statement_timeout = '30s';
