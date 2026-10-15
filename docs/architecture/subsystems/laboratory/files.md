# SUB-8 — Inventario de archivos

## Módulo `laboratory`

| Archivo | LOC | Rol | Estado |
|---|---|---|---|
| `laboratory.routes.ts` | 101 | Router (46 endpoints, roles, feature gate) | leído |
| `laboratory.controller.ts` | 395 | Controller (+SSE) | leído |
| `laboratory.service.ts` | 1022 | Service (dominio completo) | leído |
| `laboratory.schema.ts` | 14 | Zod (`createLabRequestSchema`, `labRequestIdSchema`) | leído |
| `lab-result-email.service.ts` | 135 | Resultados por email + token público | leído |
| `lab-order-pdf.service.ts` | 119 | PDF de la orden | leído |
| `lab-events.service.ts` | 33 | Event bus por tenant | leído |

## Transversales usados

| Archivo | Uso en SUB-8 |
|---|---|
| `src/middlewares/auth.middleware.ts` | `authMiddleware`, `authorize` |
| `src/middlewares/feature.middleware.ts` | `requireFeature('laboratory')` |
| `src/middlewares/validate.middleware.ts` | `validateZod` |
| `src/middlewares/asyncHandler.middleware.ts` | `asyncHandler` |
| `src/shared/db.ts` | `pool`, `readPool` |
| `src/shared/jwt.service.ts` | `signInvite`, `verify` (token de resultados) |
| `src/shared/queue.service.ts` | `enqueueJob('email:send', {tenantId})` |
| `src/shared/email.service.ts` | `sendEmail({to, subject, html, tenantId})` (worker) |
| `src/shared/query.ts` | `getQuery`, `getQueryInt` |
| `src/utils/errors.ts`, `src/utils/error-codes.ts` | `NotFoundError`, `BadRequestError`, `E.*` |
| `src/modules/doctor/doctor.service.ts` | `getDoctorByUserId` (crear orden / ownership) |
| `src/modules/notifications/notification.service.ts` | `createNotification` (in-app al entregar) |

## Tablas de base de datos

| Tabla | RLS | Definición | Dueño / uso |
|---|---|---|---|
| `lab_areas` | sí | `db/init.sql:276` | Áreas del laboratorio |
| `lab_tests` | sí | `db/init.sql:290` (+ mig 003) | Catálogo de exámenes |
| `lab_requests` | sí | `db/init.sql:322` (+ mig 002/003) | Órdenes |
| `lab_request_items` | sí | `db/init.sql:346` (+ mig 003) | Ítems/resultados |
| `lab_samples` | sí | `db/init.sql:675` (mig 004) | Muestras |
| `lab_qc_records` | sí | `db/init.sql:699` (mig 005) | Control de calidad |
| `lab_equipment` | sí | `db/init.sql:721` (mig 005) | Equipos |
| `lab_reagents` | sí | `db/init.sql:739` (mig 005) | Reactivos/stock |
| `lab_notifications` | sí | `db/init.sql:759` (mig 005) | Notificaciones internas |
| `lab_result_history` | sí | `db/init.sql:773` (mig 004) | **Tabla muerta** (FND-E4) |

RLS: `db/security.sql:90-122` (ENABLE + FORCE + policy) y `db/migrations/021_fix_rls_for_render.sql:20-42` (policy con fallback). Índices: `db/migrations/027_performance_indexes.sql`, `028_lab_analytics_indexes.sql`.

## Funciones/triggers de BD relacionadas

| Objeto | Evidencia |
|---|---|
| `update_lab_item_completed_at()` | `db/security.sql:73` (REVOKE a `clinic_app`) |
| `update_lab_request_completed_at()` | `db/security.sql:74` (REVOKE a `clinic_app`) |

## Notas

- El módulo **no crea** un repositorio; todo el SQL está inline en `laboratory.service.ts` (1022 L).
- `lab_results` **no existe** como tabla; los resultados viven en `lab_request_items.result_value`/`results` JSONB.
