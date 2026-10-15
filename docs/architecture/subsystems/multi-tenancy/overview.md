# SUB-3 — Autorización, roles y multi-tenancy (RLS)

> **Estado:** descripción AS-IS completada · **Certeza global:** confirmado (lectura de código + SQL).
> **Evidencia principal:** `src/shared/db.ts`, `src/shared/multi-tenant.service.ts`, `src/middlewares/{tenant,auth,feature}.middleware.ts`, `src/shared/ownership.ts`, `src/modules/saas/saas.service.ts`, `db/security.sql`, `db/migrations/{021,022,025}*.sql`, `tests/integration/rls-isolation.test.js`.

## 1. Propósito

Garantizar el **aislamiento de datos entre tenants** (clínicas) y la **autorización por rol y por relación** dentro de un tenant. Se implementa con **tres capas**:

1. **Contexto de tenant por request** (middleware + `AsyncLocalStorage`).
2. **RLS (Row-Level Security) en PostgreSQL** — 37 tablas con `tenant_id` (más 5 tablas SaaS).
3. **Autorización de aplicación** — rol (`requireRole`), relación médico-paciente (`ownership.ts`) y feature por plan (`requireFeature`).

## 2. Modelo de identidad de tenant

| Fuente de `tenant_id` | Prioridad | Dónde |
|---|---|---|
| `req.user.tenant_id` (del JWT) | 1ª | `tenant.middleware.ts:47,50` |
| Header `X-Tenant-Id` | 2ª (solo si no hay usuario) | `tenant.middleware.ts:46,50` |
| `DEFAULT_TENANT_ID` env | 3ª (fallback) | `tenant.middleware.ts:58`, `multi-tenant.service.ts:88` |
| `'default'` literal | 4ª (último recurso) | `multi-tenant.service.ts:88` |

- En `NODE_ENV=production`, una petición **no pública** sin tenant ⇒ `400 X-Tenant-Id header is required` (`tenant.middleware.ts:52-56`).
- Rutas públicas (`PUBLIC_PATHS`, `PUBLIC_PATH_PREFIXES`) sin tenant ⇒ operan sobre `DEFAULT_TENANT_ID` (`tenant.middleware.ts:16-35,57-61`).
- El registro de tenants vive en memoria (`Map`) con TTL 5 min y recarga perezosa desde BD (`multi-tenant.service.ts:17-84`).

## 3. Propagación del contexto a la base de datos

- `tenantContext = new AsyncLocalStorage<string>()` (`db.ts:90`); el middleware hace `tenantContext.run(tenantId, () => next())` (`tenant.middleware.ts:41-43`).
- El pool principal y el de lectura están "envueltos" por `tagTenantAwarePool` (`db.ts:102-139`): cada query **arrienda un cliente dedicado**, ejecuta `SELECT set_config('app.tenant_id', $1, false)`, corre la query y **resetea** el GUC a `default` antes de liberar. Motivo documentado: pg reparte queries entre clientes y un GUC de sesión "se filtra" (`db.ts:94-101`).
- Si no hay contexto, usa `DEFAULT_TENANT_ID` (`db.ts:122`).
- `superAdminPool` (rol `BYPASSRLS`) **no** se envuelve (`db.ts:101,168-185`): es la vía legítima para operaciones cross-tenant (jobs, webhooks, panel superadmin).

## 4. Pools de conexión (3)

| Pool | Env | Rol | Uso | Evidencia |
|---|---|---|---|---|
| `pool` | `DATABASE_URL` | `clinic_app` (NOINHERIT, RLS) | Todo el tráfico normal | `db.ts:62-72` |
| `readPool` | `DATABASE_URL_READ_ONLY` | réplica/rol lectura | Lecturas pesadas; cae a `pool` si no está | `db.ts:145-163` |
| `superAdminPool` | `DATABASE_URL_SUPERADMIN` | `clinic_superadmin` (BYPASSRLS) | Cross-tenant: SaaS, jobs, webhooks | `db.ts:168-185` |

`poolMax` default 15 (< CONNECTION LIMIT 20 de `clinic_app`) (`db.ts:24`, `security.sql:245`).

## 5. RLS (PostgreSQL)

- **Habilitado y FORZADO** en 37 tablas con `tenant_id` + 5 tablas SaaS (`security.sql:84-105,187-222`).
- Política `tenant_isolation`: `USING/WITH CHECK (tenant_id = <ctx>)` donde `<ctx>` = `COALESCE(current_setting('app.tenant_id', true), 'default')` tras migración 021 (`db/migrations/021:33-60`).
- Excepciones: `users` (superadmin con `tenant_id IS NULL` ve todo, `security.sql:146-156`, `022`), `doctors` (sin bypass), `audit_logs` (permite INSERT `'system'`, `security.sql:164-176`), `tenants` (`USING (true)`, `WITH CHECK (false)`, `security.sql:178-182`).
- Rol de app: `clinic_app` creado sin password (se setea externamente), `REVOKE ALL ... FROM PUBLIC`, sin DDL, `CONNECTION LIMIT 20`, `statement_timeout 30s` (`security.sql:19-56,245-254`).
- Funciones `SECURITY DEFINER` (auditoría) revocadas del rol de app (`security.sql:66-77`).

## 6. Autorización de aplicación

- **Rol**: `authMiddleware([roles])` valida JWT, `token_version`, sesión activa y asigna `req.user`; `requireRole`/`requireTenantRole` (`auth.middleware.ts`). *(Detalle en SUB-2.)*
- **Relación (BOLA)**: `ownership.ts` — `assertDoctorPatientRelationship` (fail-closed: sin registro clínico ni booking ⇒ `ForbiddenError`), `assertPatientInTenant` (`ownership.ts:38-58`).
- **Feature por plan**: `requireFeature(key)` → `checkFeatureAccess(key, req.tenant_id)` (`feature.middleware.ts:5-13`, `saas.service.ts:389-401`).

## 7. SaaS / planes (usa `superAdminPool`)

`saas.service.ts` gestiona `plans`, `subscriptions`, `subscription_invoices`, `tenant_features`, `tenant_usage`. Escrituras cross-tenant (crear/activar/cancelar suscripción, onboarding, reconciliación de pagos MP, job `handlePastDueSubscriptions`) usan explícitamente `superAdminPool` (`saas.service.ts:145,202,255,287,303,346,439,474,594,619`).

## 8. Findings de SUB-3 (ver `docs/architecture/05-findings.md`)

- **FND-B1 🔴** 7 tablas con fuga cross-tenant **conocida y no corregida** (`rls-isolation.test.js:33-41`).
- **FND-B2 🟡** RLS **fail-open a `'default'`** por `COALESCE(..., 'default')` — **aceptado** (2026-10-15): se mantiene por compatibilidad Render/PgBouncer; fail-closed descartado por riesgo de disponibilidad.
- **FND-B5 🟡** la migración 021 **debilita** la restricción de escritura en las 5 tablas SaaS (`USING(current_setting IS NOT NULL)`), contradiciendo el comentario de `security.sql`.
- **FND-B4 🟡** `tenants` con `USING(true)`: cualquier conexión de app lee todas las filas de tenants.
- Otros menores (B3, B6, B7, B8).

## 9. Notas de NO VERIFICADO

- Efecto real de RLS en **producción** (Render/PgBouncer) — migración 021 evidencia que `app.tenant_id` puede no soportarse como GUC custom; el fallback es `'default'`.
- Si `clinic_superadmin` se creó realmente en producción (025 es "tolerante al fallo").
- Estado de `RLS_TEST_DATABASE_URL` en CI (el test se **omite** si no está definida).
