# SUB-6 — Dependencias

## Aristas internas

| Origen | Destino | Qué | Evidencia |
|---|---|---|---|
| `booking.routes` | `auth.middleware` | `authMiddleware`, `authorize` | `booking.routes.ts:16` |
| `booking.routes` | `booking.controller` | 12 handlers | `booking.routes.ts:2-15` |
| `booking.routes` | `booking.schema` | 6 schemas | `booking.routes.ts:18` |
| `booking.controller` | `booking.service` | CRUD citas/series | `booking.controller.ts:2` |
| `booking.controller` | `doctor.service` | `getDoctorByUserId` | `booking.controller.ts:3` |
| `booking.service` | `shared/db` | `pool`, `readPool` | `booking.service.ts:1` |
| `booking.service` | `shared/booking-utils` | `validateBookingSlot` | `booking.service.ts:10` |
| `booking.service` | `shared/booking-history` | `recordBookingStatusChange` | `booking.service.ts:11` |
| `booking.service` | `waitlist.service` | `notifyWaitlistForSlot` | `booking.service.ts:12` |
| `booking.service` | `notification.service` | `createNotification` | `booking.service.ts:13` |
| `booking.service` | `shared/queue.service` | `enqueueJob` (emails) | `booking.service.ts:4` |
| `booking.service` | `shared/jwt.service` | `signInvite`/`verify` | `booking.service.ts:5` |
| `guest.service` | `booking-utils` | `validateBookingSlot` | `guest.service.ts:11` |
| `guest.service` | `booking-history` | `recordBookingStatusChange` | `guest.service.ts:12` |
| `guest.service` | `doctor.service` | `getDoctorById` | `guest.service.ts:2` |
| `guest.service` | `email.service` | `sendEmail` (directo, no cola) | `guest.service.ts:4` |
| `availability.controller` | `doctor.service` | `getDoctorByUserId`/`getDoctorById` | `availability.controller.ts:2` |
| `waitlist.service` | `queue.service` + `notification.service` | email + in-app | `waitlist.service.ts:3-4` |
| `holidays.service` | `waitlist.service` | `notifyWaitlistForSlot` | `holidays.service.ts:6` |
| `holidays.service` | `queue.service` | `enqueueJob` (email cancelación) | `holidays.service.ts:3` |
| `calendar.service` | `ics.util` | `buildCalendar`, `buildVEvent` | `calendar.service.ts:5` |
| `reminder.job` | `email.service` | `sendEmail` (recordatorios) | `reminder.job.ts:3` |
| `reminder.job` | `shared/db` | `pool` | `reminder.job.ts:2` |

## Depende de (otros subsistemas)

- **SUB-2/SUB-3**: `authMiddleware`/`authorize`/`optionalAuth`, tenant context y RLS.
- **SUB-5** (`doctor`): `getDoctorById`, `getDoctorByUserId`, `slot_duration`.
- **SUB-13** (notificaciones): `createNotification` (in-app).
- **SUB-10/JOB** (`queue.service`): entrega de emails por cola.

## Es dependido por

- **SUB-7** (clinical): crea `lab_requests` a partir de una cita (`booking_id`); `doesDoctorHaveBookingWithPatient` usa `bookings`.
- **Frontend** `bookings`, `booking`, `doctor` (SUB-1).
- **SUB-12** (reports): densidad de citas.
- **SUB-11** (billing): una cita puede facturarse.

## Riesgos de acoplamiento

- **Doble implementación de creación/cancelación de cita** (`booking.service` vs `guest.service`) → divergencia de efectos secundarios (waitlist, in-app, series). Ver FND-D6.
- `holidays.service` llama `notifyWaitlistForSlot` para una fecha cerrada (no hay hueco real) → acoplamiento semánticamente incorrecto.
- `reminder.job` ejecuta `sendEmail` **sin** `tenantId` → acopla el envío al tenant por defecto (FND-D1).

## Dependencias circulares

Ninguna detectada. `booking.service` → `waitlist.service`; `holidays.service` → `waitlist.service`; `waitlist.service` no importa de vuelta a `booking`/`holidays`.
