# SUB-15 — Módulos y capas

| ID | Unidad | Tipo | Archivo | Responsabilidad | LOC |
|---|---|---|---|---|---|
| SUB15-U1 | db (pools/ALS) | Shared | `src/shared/db.ts` | 3 pools, SSL/CA, `tagTenantAwarePool`, `tenantContext` (ALS) | 189 |
| SUB15-U2 | multi-tenant.service | Shared | `src/shared/multi-tenant.service.ts` | Caché en memoria de tenants + `getTenantId` | 91 |
| SUB15-U3 | tenant.middleware | Middleware | `src/middlewares/tenant.middleware.ts` | Puebla `tenantContext` / `req.tenant_id` (ver SUB-3) | ~91 |
| SUB15-U4 | init.sql | Esquema | `db/init.sql` | Definición de tablas/índices/triggers/seeds | 1198 |
| SUB15-U5 | security.sql | RLS/roles | `db/security.sql` | Roles `clinic_app`/`clinic_superadmin`, RLS, auditoría | 357 |
| SUB15-U6 | migrations | Migraciones | `db/migrations/001–031` | Evolución del esquema | 31 archivos |
| SUB15-U7 | optimize.sql | Operación | `db/optimize.sql` | EXPLAIN/estadísticas post-seed (manual) | 129 |
| SUB15-U8 | postgresql.conf | Infra | `db/postgresql.conf` | Config de PostgreSQL 15 para VM 4 GB | 94 |

## Repositorios de acceso

No hay capa `repository/`; el SQL vive **inline** en los `*.service.ts` de cada módulo, usando `pool.query` / `pool.connect()` (transacciones). Módulos con mayor volumen de SQL: `auth.service` (962 L), `laboratory.service` (1022 L), `booking.service`, `clinical-record.service`, `saas.service`.

## Tipos

- `pool`, `readPool`, `superAdminPool`, `query` (binding), `tenantContext`, tipos derivados `Pool`/`PoolClient`/`QueryResult`.

## Notas

- **SUB15-U1** es el punto único de conexión; centraliza RLS-context y SSL.
- **SUB15-U8** es para despliegue en VM propia; en Render los parámetros los gestiona el proveedor (NO VERIFICADO).
