# SUB-15 — Inventario de archivos

## Código

| Archivo | LOC | Rol |
|---|---|---|
| `src/shared/db.ts` | 189 | Pools, SSL/CA, `tagTenantAwarePool`, `tenantContext` (ALS), `query` |
| `src/shared/multi-tenant.service.ts` | 91 | Caché de tenants (TTL 5 min), `getTenantId` |
| `src/middlewares/tenant.middleware.ts` | ~91 | Resolución de tenant + `tenantContext.run` |

## Esquema / datos

| Archivo | LOC | Rol |
|---|---|---|
| `db/init.sql` | 1198 | 49 tablas, 138 índices, 14 triggers, seeds (CIE-10, lab_tests, specialties, planes) |
| `db/security.sql` | 357 | Roles, RLS, auditoría (ver SUB-3) |
| `db/migrations/001–031` | 31 archivos | Evolución del esquema |
| `db/optimize.sql` | 129 | EXPLAIN/índices/estadísticas post-seed (manual) |
| `db/postgresql.conf` | 94 | Config PostgreSQL 15 (VM propia) |
| `db/ci-rls-bootstrap.sql`, `db/ci-seed-rls.sql` | — | Bootstrap de RLS en CI |

## Variables de entorno (DB)

`DATABASE_URL`, `DATABASE_URL_READ_ONLY`, `DATABASE_URL_SUPERADMIN`, `DB_POOL_MAX` (15), `DB_CA_CERT`, `DB_SSL_REJECT_UNAUTHORIZED`, `DEFAULT_TENANT_ID`.

## Dependencias npm

`pg` (^8.18). Sin query builder ni ORM. Migraciones aplicadas por script propio (no Flyway/Knex/Prisma).

## Consumidores del subsistema

- **Todos** los `*.service.ts` (SQL inline).
- **Jobs** (`reminder.job.ts`, cleanup) — sin contexto de request.
- **Seeds** (`src/seeds/*`) — bcrypt + inserts.
- **Tests** (`tests/integration/rls-isolation.test.js`).
