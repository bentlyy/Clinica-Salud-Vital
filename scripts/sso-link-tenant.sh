#!/usr/bin/env bash
# Vincula un tenant de Vitaria con una organizacion del Core (@amg/platform).
#
# La app NO puede escribir `tenants`: la RLS es FORCE con WITH CHECK (false).
# Este script corre FUERA DE BANDA con un rol BYPASSRLS (DATABASE_URL_SUPERADMIN),
# igual que las migraciones. Requiere haber aplicado db/migrations/032_amg_sso.sql.
#
# Uso:
#   DATABASE_URL_SUPERADMIN='postgres://user:pass@host:5432/clinicdb' \
#     ./scripts/sso-link-tenant.sh <tenant_id|domain> <core_org_id>
#
# Ejemplo:
#   ./scripts/sso-link-tenant.sh clinica-salud-vital org_abc123
#
# Verificacion (sin escribir): ./scripts/sso-link-tenant.sh --check
set -euo pipefail

: "${DATABASE_URL_SUPERADMIN:?Define DATABASE_URL_SUPERADMIN (rol BYPASSRLS, igual que las migraciones)}"

TENANT="${1:-}"
ORG="${2:-}"

if [[ "$TENANT" == "--check" ]]; then
  psql "$DATABASE_URL_SUPERADMIN" -v ON_ERROR_STOP=1 -c \
    "SELECT id, name, domain, active, sso_org_id
       FROM tenants
      ORDER BY created_at
      LIMIT 50;"
  exit 0
fi

if [[ -z "$TENANT" || -z "$ORG" ]]; then
  echo "Uso: DATABASE_URL_SUPERADMIN=... $0 <tenant_id|domain> <core_org_id>" >&2
  echo "     $0 --check   (lista tenants y su sso_org_id)" >&2
  exit 1
fi

# Los ids del Core y de los tenants son [A-Za-z0-9_-]; validar evita romper el SQL.
if [[ ! "$TENANT" =~ ^[A-Za-z0-9_-]+$ || ! "$ORG" =~ ^[A-Za-z0-9_-]+$ ]]; then
  echo "Error: tenant y org solo admiten [A-Za-z0-9_-]" >&2
  exit 1
fi

# 1) La columna debe existir (migracion 032 aplicada).
HAS_COL=$(psql "$DATABASE_URL_SUPERADMIN" -tAc \
  "SELECT 1 FROM information_schema.columns
    WHERE table_name='tenants' AND column_name='sso_org_id'")
if [[ "$HAS_COL" != "1" ]]; then
  echo "Error: falta tenants.sso_org_id. Aplica db/migrations/032_amg_sso.sql primero." >&2
  exit 1
fi

# 2) El tenant debe existir (por id o por domain) y no estar ya vinculado a OTRA org.
MATCH=$(psql "$DATABASE_URL_SUPERADMIN" -tAc \
  "SELECT count(*) FROM tenants WHERE id = '$TENANT' OR domain = '$TENANT'")
if [[ "$MATCH" != "1" ]]; then
  echo "Error: '$TENANT' coincide con $MATCH tenants (esperado exactamente 1)." >&2
  echo "Corre '$0 --check' para ver id/domain." >&2
  exit 1
fi

echo "Vinculando tenant '$TENANT' -> organizacion del Core '$ORG' ..."
psql "$DATABASE_URL_SUPERADMIN" -v ON_ERROR_STOP=1 -c \
  "UPDATE tenants
      SET sso_org_id = '$ORG', updated_at = NOW()
    WHERE id = '$TENANT' OR domain = '$TENANT'
      AND sso_org_id IS DISTINCT FROM '$ORG';"

echo "OK. Estado actual:"
psql "$DATABASE_URL_SUPERADMIN" -v ON_ERROR_STOP=1 -c \
  "SELECT id, name, domain, active, sso_org_id
     FROM tenants
    WHERE id = '$TENANT' OR domain = '$TENANT';"

echo
echo "Siguiente: el usuario entra por https://vitaria.amgdeveloper.cl y se crea/enlaza"
echo "su fila en users (por sso_sub o por email) dentro del tenant. No hay paso manual."
