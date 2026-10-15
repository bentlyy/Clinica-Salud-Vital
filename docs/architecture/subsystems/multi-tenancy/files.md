# SUB-3 — Inventario de archivos

> Generado a partir del catálogo global. Ruta relativa a la raíz del repo.

## Código fuente

| Archivo | Capa | Función clave | LOC | Estado |
|---|---|---|---|---|
| `src/shared/db.ts` | Infra | `pool`, `readPool`, `superAdminPool`, `tenantContext`, `tagTenantAwarePool` | 189 | leído |
| `src/shared/multi-tenant.service.ts` | Servicio | `tenantService`, `getTenantId`, `loadTenantsFromDB` | 91 | leído |
| `src/middlewares/tenant.middleware.ts` | Middleware | `tenantMiddleware` | 91 | leído |
| `src/middlewares/auth.middleware.ts` | Middleware | `authMiddleware`, `optionalAuth`, `authorize(...roles)` | — | leído (SUB-2) |
| `src/middlewares/feature.middleware.ts` | Middleware | `requireFeature` | 13 | leído |
| `src/shared/ownership.ts` | Util | `assertDoctorPatientRelationship`, `assertPatientInTenant` | 58 | leído |
| `src/modules/saas/saas.service.ts` | Módulo | Planes/suscripciones/features/usage/onboarding | 675 | leído |
| `src/modules/saas/onboarding.service.ts` | Módulo | `insertOnboarding`, `insertOnboardingDocuments` | — | referenciado (no leído) |
| `src/shared/currencies.ts` | Util | `convertFromUsd`, `SUPPORTED_COUNTRIES` | — | referenciado |

## Base de datos

| Archivo | Contenido | Estado |
|---|---|---|
| `db/security.sql` | Rol app, RLS 37+5 tablas, triggers auditoría, privilegios | leído |
| `db/init.sql` | Esquema base (`users` con `blocked_until`:35 y `locked_until`:43) | parcial |
| `db/migrations/021_fix_rls_for_render.sql` | RLS con `COALESCE(...,'default')` | leído |
| `db/migrations/022_fix_rls_superadmin_check.sql` | WITH CHECK superadmin | leído |
| `db/migrations/025_create_superadmin_role.sql` | Rol `clinic_superadmin BYPASSRLS` | leído |
| `db/migrations/020*`, `023*`, `024*` | (marcadores) | pendiente |
| `db/ci-rls-bootstrap.sql` | Bootstrap RLS para CI | pendiente |

## Pruebas

| Archivo | Cobertura | Estado |
|---|---|---|
| `tests/integration/rls-isolation.test.js` | Aislamiento cross-tenant (opt-in vía `RLS_TEST_DATABASE_URL`) | leído |

## Consumidores del aislamiento (muestra)

Prácticamente todo `src/modules/**/*.service.ts` consulta mediante `pool` (y por tanto RLS aplica). Los módulos que **intencionalmente** usan `superAdminPool` para cross-tenant: `saas.service.ts`, panel `superadmin`, jobs (`handlePastDueSubscriptions`), webhooks (`mercadopago`).
