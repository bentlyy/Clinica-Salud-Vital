# SUB-10 — Módulos y capas

| ID | Unidad | Tipo | Archivo | Responsabilidad | LOC |
|---|---|---|---|---|---|
| SUB10-U1 | notification.routes | Route | `src/modules/notifications/notification.routes.ts` | Montaje rutas `/api/notifications` | 14 |
| SUB10-U2 | notification.controller | Controller | `src/modules/notifications/notification.controller.ts` | scope superadmin, validación query/params, handlers | 41 |
| SUB10-U3 | notification.service | Service | `src/modules/notifications/notification.service.ts` | CRUD `notifications`: create/list/count/mark | 116 |
| SUB10-U4 | notification.schema | Schema (Zod) | `src/modules/notifications/notification.schema.ts` | `notificationIdSchema` | 5 |
| SUB10-U5 | reminder.job | Job | `src/jobs/reminder.job.ts` | Cron recordatorios (1h/24h), reintento exponencial | 120 |
| SUB10-U6 | audit-integrity.job | Job/utility | `src/jobs/audit-integrity.job.ts` | Verificación cadena HMAC de `audit_logs` | 41 |

## Capas

`routes` → `controller` (scope + asyncHandler) → `service` (SQL inline sobre `pool`). Jobs usan `pool` + `sendEmail` directamente (sin controller/route).

## Tipos clave

- `CreateNotificationInput` (`notification.service.ts:5-12`)
- `EmailOptions`, `BookingRow` (`reminder.job.ts:8-24`)
- `PaginatedResponse` (`notification.service.ts:3`)

## NOTAS

- `markAllAsRead` no implementa `allUsers` (diferencia intencional/overlook AS-IS).
- Recordatorio no crea notificaciones in-app.
- `audit-integrity` sí programado (cron 6h, `app.ts:517-529`); ver SUB-13 para defectos de la cadena.