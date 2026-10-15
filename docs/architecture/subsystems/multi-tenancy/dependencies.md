# SUB-3 — Dependencias

## Dependencias internas (aristas)

| Origen | Destino | Qué | Evidencia |
|---|---|---|---|
| `app.ts` | `tenant.middleware` | Monta el middleware de tenant antes de los routers | `app.ts` |
| `tenant.middleware` | `multi-tenant.service` | `tenantService.getById`, `loadTenantsFromDB` | `tenant.middleware.ts:64,68` |
| `tenant.middleware` | `db.ts` | `tenantContext.run(...)` | `tenant.middleware.ts:3,42` |
| `db.ts` | `async_hooks` | `AsyncLocalStorage` | `db.ts:2,90` |
| `feature.middleware` | `saas.service` | `checkFeatureAccess` | `feature.middleware.ts:3,7` |
| `saas.service` | `db.ts` | `pool` + `superAdminPool` | `saas.service.ts:1` |
| `saas.service` | `onboarding.service` | `insertOnboarding*` | `saas.service.ts:6,538,552` |
| `saas.service` | `currencies` | conversión USD/moneda | `saas.service.ts:5,134,177` |
| `ownership` | `db.ts` | `pool` (RLS activo) | `ownership.ts:1` |
| `ownership` | `errors` | `ForbiddenError`, `NotFoundError` | `ownership.ts:2` |
| `multi-tenant.service` | `db.ts` | `pool` para cargar tenants | `multi-tenant.service.ts:1,62` |

## Depende de (externos)

- PostgreSQL (RLS, `set_config`, `current_setting`, roles `NOINHERIT`/`BYPASSRLS`, `SECURITY DEFINER`).
- `pg` (`Pool`), `node:async_hooks` (`AsyncLocalStorage`).

## Es dependido por

- **Casi todos** los servicios de dominio (usan `pool` ⇒ pasan por RLS).
- Módulos cross-tenant: `saas`, `superadmin`, jobs, webhooks (usan `superAdminPool`).

## Grados

- **Fan-out alto:** `db.ts` (proveedor de acceso a datos central; cualquier cambio afecta a todo).
- **Fan-in alto:** `saas.service` (usado por feature middleware, routers SaaS, jobs, webhooks).

## Riesgos de acoplamiento

- La corrección del aislamiento depende de que **toda** escritura de dominio pase por `pool` (envuelto). Un `new Pool(...)` ad-hoc o un query con el cliente equivocado rompería RLS sin error (fallback `'default'`).
- `superAdminPool` degrada a `pool` si falta `DATABASE_URL_SUPERADMIN` (`db.ts:168-181`); en ese caso las operaciones cross-tenant verían sólo `'default'` → fallo silencioso de funcionalidad (no de aislamiento).

## Dependencias circulares

Ninguna detectada en SUB-3.
