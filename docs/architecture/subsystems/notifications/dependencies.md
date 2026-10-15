# SUB-10 — Dependencias

## Aristas internas (backend)

| Origen | → Destino | Tipo | Evidencia |
|---|---|---|---|
| `notification.routes` | `auth.middleware` | import | `:2` |
| `notification.routes` | `validate.middleware` | import | `:3` |
| `notification.routes` | `notification.controller` | import | `:4` |
| `notification.routes` | `notification.schema` | import | `:5` |
| `notification.controller` | `notification.service` | call | `:2,19,29,34,39` |
| `notification.controller` | `asyncHandler` | import | `:3` |
| `notification.controller` | `shared/query` | import | `:4` |
| `notification.service` | `shared/db.pool` | query | `:1,16,56,65,91,99,110` |
| `notification.service` | `utils/errors.NotFoundError` | throw | `:2,105` |
| `reminder.job` | `shared/db.pool` | query/UPDATE | `:2,41,81` |
| `reminder.job` | `shared/email.service.sendEmail` | call | `:3,29` |
| `reminder.job` | `shared/escape.escapeHtml` | call | `:4,72-78` |
| `reminder.job` | `utils/logger` | log | `:5,86,102,117` |
| `reminder.job` | `utils/errors.BadRequestError` | throw | `:6,38` |
| `audit-integrity.job` | `shared/db.pool` | query | `:1,15` |
| `audit-integrity.job` | `utils/logger` | log | `:2,22,34` |
| `audit-integrity.job` | `shared/crypto.service.computeHmac` | call | `:3,30` |

## Aristas montaje/arranque

| Origen | → Destino | Tipo | Evidencia |
|---|---|---|---|
| `app.ts` | `modules/notifications/notification.routes` | mount | `app.use(\`${API_PREFIX}/notifications\`, notificationRoutes)` `app.ts:284` |
| `app.ts` | `jobs/reminder.job.startReminderJob` | call | `app.ts:311` |
| `app.ts` | `jobs/audit-integrity.job.verifyAuditChain` | call (cron 6h) | `app.ts:16,519` |

## Depende de

- **SUB-3 (multi-tenancy)**: `req.tenant_id`, scope `allUsers` + `tenantFilter` para superadmin.
- **SUB-4 (seguridad)**: auth, validación params.
- **SUB-6 (booking)**: `bookings` (reminders consultan y actualizan `reminder_1h_sent`, `reminder_24h_sent`, `status`, `confirmed`, `confirmation_token`).
- **SUB-8 (lab)**: `backfillLabNotifications` crea notificaciones relacionadas a laboratorio.
- **SUB-13 (auditoría)**: `audit_logs` + HMAC (`audit-integrity`).
- **SUB-15 (BD)**: `notifications`, `bookings`, `audit_logs`.

## Es dependido por

- **Frontend notifications**: lista, unread-count, marcar leídas (in-app).
- **Varios módulos**: pueden llamar `createNotification` (usado por seed/backfill).

## Acoplamientos detectados

- `markAllAsRead` no respeta `allUsers` → comportamiento inesperado para superadmin.
- Cron corre por instancia (sin advisory lock) → posible doble envío en multi-instancia (NO VERIFICADO).
- `audit-integrity` programado como cron cada 6h (`app.ts:517-529`); la cadena HMAC no se puebla (ver SUB-13 / FND-M1).
- Reminders no crean notificaciones in-app (solo email).
