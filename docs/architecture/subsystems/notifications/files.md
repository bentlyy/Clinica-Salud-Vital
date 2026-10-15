# SUB-10 — Inventario de archivos

## Backend (propios)

| Archivo | LOC | ID | Tipo | Entry/Exit |
|---|---|---|---|---|
| `src/modules/notifications/notification.routes.ts` | 14 | MOD-b-notif-route | Router | importado en `app.ts:284` → montado `/api/notifications` |
| `src/modules/notifications/notification.controller.ts` | 41 | MOD-b-notif-controller | Controllers | importado por routes |
| `src/modules/notifications/notification.service.ts` | 116 | MOD-b-notif-service | Service+SQL | importado por controller |
| `src/modules/notifications/notification.schema.ts` | 5 | MOD-b-notif-schema | Zod schema | importado por routes (`:id/read`) |
| `src/jobs/reminder.job.ts` | 120 | JOB-reminders | Cron job | `startReminderJob()` llamado en `app.ts:311` |
| `src/jobs/audit-integrity.job.ts` | 41 | JOB-audit-integrity | Utility | importado y programado (cron 6h) en `app.ts:517-529` |

## Backend (consumidos)

| Archivo | LOC | ID | Rol | Evidencia |
|---|---|---|---|---|
| `src/shared/db.ts` | 189 | SVC-db | `pool` | service y jobs |
| `src/shared/email.service.ts` | 158 | SVC-email | `sendEmail` + retry | `reminder.job.ts:3,29` |
| `src/shared/escape.ts` | ~ | SVC-escape | `escapeHtml` | `reminder.job.ts:4,72-78` |
| `src/shared/query.ts` | ~ | SVC-query | `getQueryInt/getQueryString` | `notification.controller.ts:4` |
| `src/utils/errors.ts` | ~ | ERR-utils | `NotFoundError`, `BadRequestError` | service/jobs |
| `src/utils/logger.ts` | ~ | LOG-logger | logs | jobs |
| `src/middlewares/auth.middleware.ts` | 165 | MW-auth | `authMiddleware` | routes |
| `src/middlewares/validate.middleware.ts` | ~ | MW-validate | `validateZod` | routes |
| `src/middlewares/asyncHandler.middleware.ts` | ~ | MW-async | `asyncHandler` | controller |

## Frontend

| Archivo | LOC | ID | Tipo |
|---|---|---|---|
| `frontend/src/modules/notifications/*` | — | MOD-f-notif | Hooks/páginas (listado/marcar) (no auditado en profundidad aquí) |

## Tablas

`notifications` (crear/listar/contar/marcar). Cross-ref: `bookings` (reminders), `audit_logs` (integrity).

## Variables de entorno

`FRONTEND_URL`, `RENDER_EXTERNAL_URL`, `NODE_ENV`, configuración SendGrid (`SENDGRID_API_KEY`, `FROM_EMAIL`) vía `email.service.ts`.
