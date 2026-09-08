-- ============================================================
-- 025: Crear rol clinic_superadmin con BYPASSRLS (opcional)
-- ============================================================
-- Problema: El panel SuperAdmin muestra 0 para todos los tenants
-- excepto 'default' porque RLS filtra los datos por app.tenant_id.
--
-- Solución: Crear un rol dedicado con BYPASSRLS que el módulo
-- superadmin usa vía DATABASE_URL_SUPERADMIN en Render.
-- Este rol ve todas las filas sin importar la configuración de RLS.
--
-- Tolerante: en entornos donde el usuario de BD no puede crear roles
-- (p.ej. algunos PostgreSQL gestionados), la migración NO debe
-- fallar ni bloquear migraciones posteriores. El módulo superadmin
-- cae automáticamente al pool normal via superAdminPool (db.ts).
-- ============================================================

DO $$
DECLARE
  role_created BOOLEAN;
BEGIN
  role_created := EXISTS (SELECT FROM pg_roles WHERE rolname = 'clinic_superadmin');

  IF NOT role_created THEN
    BEGIN
      EXECUTE 'CREATE ROLE clinic_superadmin LOGIN BYPASSRLS';
      RAISE NOTICE 'Role clinic_superadmin created';
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'No se pudo crear rol clinic_superadmin (%). El panel superadmin usara la conexion normal.', SQLERRM;
    END;
  ELSE
    RAISE NOTICE 'Role clinic_superadmin already exists';
  END IF;

  role_created := EXISTS (SELECT FROM pg_roles WHERE rolname = 'clinic_superadmin');
  IF NOT role_created THEN
    RAISE WARNING 'clinic_superadmin no existe - omitiendo GRANTs y configuracion del rol';
    RETURN;
  END IF;

  -- Permisos equivalentes a clinic_app (DML completo, sin DDL)
  EXECUTE 'GRANT USAGE ON SCHEMA public TO clinic_superadmin';
  EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO clinic_superadmin';
  EXECUTE 'GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO clinic_superadmin';

  -- Para futuras tablas
  EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO clinic_superadmin';
  EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO clinic_superadmin';

  -- Seguridad: timeout de statements
  EXECUTE 'ALTER ROLE clinic_superadmin SET statement_timeout = ''30s''';
END $$;