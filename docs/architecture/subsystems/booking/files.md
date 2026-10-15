# SUB-6 — Inventario de archivos

## Módulo `booking`

| Archivo | LOC | Rol | Estado |
|---|---|---|---|
| `booking.routes.ts` | 36 | Router | leído |
| `booking.controller.ts` | 136 | Controller | leído |
| `booking.service.ts` | 894 | Service | leído |
| `booking.schema.ts` | 32 | Zod | leído |
| `booking.email.ts` | 52 | Plantillas | leído |

## Módulo `availability`

| Archivo | LOC | Rol | Estado |
|---|---|---|---|
| `availability.routes.ts` | 77 | Router | leído |
| `availability.controller.ts` | 97 | Controller | leído |
| `availability.service.ts` | 190 | Service | leído |
| `availability.schema.ts` | — | Zod | leído (referencia) |

## Módulo `waitlist`

| Archivo | LOC | Rol | Estado |
|---|---|---|---|
| `waitlist.routes.ts` | 14 | Router | leído |
| `waitlist.controller.ts` | 27 | Controller | leído |
| `waitlist.service.ts` | 188 | Service | leído |
| `waitlist.schema.ts` | — | Zod | referenciado |

## Módulo `guest`

| Archivo | LOC | Rol | Estado |
|---|---|---|---|
| `guest.routes.ts` | 26 | Router (+limiters) | leído |
| `guest.controller.ts` | 44 | Controller | leído |
| `guest.service.ts` | 175 | Service | leído |
| `guest.schema.ts` | — | Zod | referenciado |
| `guest.email.ts` | — | Plantillas | referenciado |

## Módulo `holidays`

| Archivo | LOC | Rol | Estado |
|---|---|---|---|
| `holidays.routes.ts` | 14 | Router | leído |
| `holidays.controller.ts` | — | Controller | referenciado |
| `holidays.service.ts` | 166 | Service | leído |
| `holidays.schema.ts` | — | Zod | referenciado |

## Módulo `calendar`

| Archivo | LOC | Rol | Estado |
|---|---|---|---|
| `calendar.routes.ts` | 19 | Router | leído |
| `calendar.controller.ts` | — | Controller | referenciado |
| `calendar.service.ts` | 111 | Service | leído |
| `calendar.schema.ts` | — | Zod | referenciado |
| `ics.util.ts` | — | Util ICS (puro) | referenciado |

## Transversales

| Archivo | LOC | Uso en SUB-6 |
|---|---|---|
| `src/jobs/reminder.job.ts` | 120 | Cron recordatorios 1h/24h |
| `src/shared/booking-utils.ts` | 125 | Validación de slot compartida |
| `src/shared/booking-history.ts` | 39 | Historial de estados |
| `src/middlewares/auth.middleware.ts` | — | `authMiddleware`, `authorize`, `optionalAuth` |
| `src/middlewares/validate.middleware.ts` | — | `validateZod` |
| `src/middlewares/tenant.middleware.ts` | 91 | `PUBLIC_PATHS`/prefijos; contexto RLS |
| `src/shared/jwt.service.ts` | — | `signInvite`/`verify` (token de confirmación) |
| `src/shared/email.service.ts` | — | `sendEmail` (recordatorios directos) |
| `src/shared/queue.service.ts` | — | `enqueueJob('email:send', …)` |
| `src/modules/notifications/notification.service.ts` | — | `createNotification` in-app |
| `src/modules/doctor/doctor.service.ts` | — | `getDoctorById`, `getDoctorByUserId` |

## Tablas de base de datos

| Tabla | RLS | Módulo dueño |
|---|---|---|
| `bookings` | sí | booking / guest |
| `booking_series` | sí | booking |
| `booking_status_history` | sí | booking (vía shared) |
| `doctor_availability` | sí | availability |
| `doctor_exceptions` | sí | availability |
| `waitlist` | sí | waitlist |
| `clinic_holidays` | sí | holidays |

> Verificación RLS exacta pendiente en Fase 7 (`db/security.sql` + migraciones).
