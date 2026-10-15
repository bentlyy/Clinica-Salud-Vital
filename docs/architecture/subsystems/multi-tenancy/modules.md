# SUB-3 — Módulos y capas

| ID | Unidad | Tipo | Archivo | Responsabilidad | LOC |
|---|---|---|---|---|---|
| SUB3-U1 | `db.ts` (pools + contexto) | Infra BD | `src/shared/db.ts` | 3 pools, `tenantContext` (ALS), wrapper `tagTenantAwarePool`, SSL/CA | 189 |
| SUB3-U2 | `multi-tenant.service.ts` | Servicio | `src/shared/multi-tenant.service.ts` | Registro de tenants en memoria (TTL 5m) + carga desde BD | 91 |
| SUB3-U3 | `tenant.middleware.ts` | Middleware | `src/middlewares/tenant.middleware.ts` | Resuelve tenant y abre el contexto ALS por request | 91 |
| SUB3-U4 | `auth.middleware.ts` | Middleware | `src/middlewares/auth.middleware.ts` | `authMiddleware`, `optionalAuth`, `requireRole`/`requireTenantRole` | — |
| SUB3-U5 | `feature.middleware.ts` | Middleware | `src/middlewares/feature.middleware.ts` | `requireFeature(key)` por plan SaaS | 13 |
| SUB3-U6 | `ownership.ts` | Util | `src/shared/ownership.ts` | Checks de relación doctor↔paciente (BOLA), fail-closed | 58 |
| SUB3-U7 | `saas.service.ts` | Módulo | `src/modules/saas/saas.service.ts` | Planes, suscripciones, features, usage, onboarding, MP | 675 |
| SUB3-U8 | `security.sql` | Script BD | `db/security.sql` | Rol `clinic_app`, RLS, triggers auditoría, privilegios | 406 |
| SUB3-U9 | Migraciones RLS | Script BD | `db/migrations/021,022,025` | Fix RLS Render, superadmin WITH CHECK, rol BYPASSRLS | 110/16/51 |
| SUB3-U10 | Test RLS | Test | `tests/integration/rls-isolation.test.js` | Verificación de aislamiento contra PG real | 96 |

## Notas de responsabilidad

- **SUB3-U1** es el punto único donde se decide qué pool ve qué: la envoltura `query`/`connect` es lo que hace que las policies `tenant_isolation` funcionen sin pasar el tenant a cada query.
- **SUB3-U2** es cache en memoria por proceso: en un despliegue multi-instancia cada instancia tiene su propio cache; la invalidación es por TTL (5 min) o `loadFromDB` explícito (p. ej. tras `onboardTenant`, `saas.service.ts:561`).
- **SUB3-U4** se solapa con SUB-2 (auth); aquí se documenta solo su rol como autorizador (roles/tenant).
