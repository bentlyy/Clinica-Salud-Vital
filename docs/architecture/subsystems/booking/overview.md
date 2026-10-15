# SUB-6 — Agenda, disponibilidad y citas

> **Estado:** descripción AS-IS completada · **Certeza global:** confirmado (lectura de código).
> **Evidencia principal:** `src/modules/booking/*`, `src/modules/availability/*`, `src/modules/waitlist/*`, `src/modules/guest/*`, `src/modules/holidays/*`, `src/modules/calendar/*`, `src/shared/booking-utils.ts`, `src/shared/booking-history.ts`, `src/jobs/reminder.job.ts`; montaje en `src/app.ts:267-290`.

## 1. Propósito

Gestionar la **agenda clínica**: definir la **disponibilidad semanal** de cada doctor y sus **excepciones**, calcular **huecos libres**, **crear/reprogramar/cancelar citas** (de pacientes autenticados, **invitados** sin cuenta y **series recurrentes**), gestionar **feriados** de la clínica, mantener una **lista de espera** por slot liberado, notificar por **email/in-app**, exportar la agenda en **ICS** y enviar **recordatorios** por cron.

Es el subsistema de mayor **volumen de reglas de negocio** (validación de slot, concurrencia anti-doble-reserva, máquina de estados de la cita) y el principal punto de entrada público (reserva de invitados).

## 2. Componentes (6 módulos backend + 1 job)

| Módulo | Responsabilidad | Persistencia |
|---|---|---|
| `booking` | Citas + series recurrentes + confirmación + slots + densidad | `bookings`, `booking_series`, `booking_status_history` |
| `availability` | Disponibilidad semanal y excepciones por doctor | `doctor_availability`, `doctor_exceptions` |
| `waitlist` | Lista de espera por doctor/fecha + notificación de hueco | `waitlist` |
| `guest` | Reserva/cancelación/consulta sin cuenta (solo RUT + token) | `bookings` (columnas `guest_*`) |
| `holidays` | Feriados de la clínica + cancelación en cascada | `clinic_holidays` |
| `calendar` | Exportación ICS de la agenda del doctor | (solo lectura) |
| `reminder.job` | Cron de recordatorios 1h / 24h | (solo escritura de flags) |

## 3. Superficie HTTP (montaje `src/app.ts:267-290`)

| Base | Router | Limiter |
|---|---|---|
| `/api/bookings` | `bookingRoutes` | global |
| `/api/availability` | `availabilityRouter` | global |
| `/api/availability-exceptions` | `exceptionRouter` | global |
| `/api/guest` | `guestRoutes` | propios (ver §3.3) |
| `/api/waitlist` | `waitlistRoutes` | global |
| `/api/holidays` | `holidaysRoutes` | global |
| `/api/calendar` | `calendarRoutes` | global |

### 3.1 `/api/bookings` — roles

| Método y ruta | Auth | Roles | Notas |
|---|---|---|---|
| `POST /` | sí | cualquiera | crea cita para `req.user.id` |
| `POST /confirm/:token` | **público** (prefijo) | — | confirma por token |
| `GET /me` | sí | cualquiera | citas propias |
| `GET /available-slots` | **público** | — | huecos por `doctor_id`+`date` |
| `PATCH /:id/cancel` | sí | cualquiera | solo el dueño (`user_id`) |
| `PATCH /:id/reschedule` | sí | cualquiera | solo el dueño |
| `GET /doctor/daily-density` | sí | `doctor` | densidad por rango |
| `GET /doctor` | sí | `doctor` | citas del doctor |
| `GET /all` | sí | `admin`, `superadmin` | listado global |
| `POST /series` | sí | `doctor`,`admin`,`superadmin`,`patient`,`user` | series recurrentes |
| `GET /series` | sí | cualquiera | propias (paciente) o del doctor |
| `PATCH /series/:id/cancel` | sí | cualquiera | dueño o staff |

### 3.2 `/api/availability`, `/api/availability-exceptions` — roles

- `/me` (GET) y escrituras: `doctor`. `bulk`: `doctor`,`admin`,`superadmin`.
- **`GET /api/availability/:id` es público** (sin `authMiddleware`) — ver FND-D12.

### 3.3 `/api/guest` — roles y límites

| Método y ruta | Middleware | Limiter |
|---|---|---|
| `POST /booking` | zod | `guestBookingLimiter` 5/hora |
| `GET /bookings/:rut` | zod | `rutLookupLimiter` 3/15 min |
| `DELETE /booking/:id` | `optionalAuth` + zod | **sin limiter** |

### 3.4 `/api/waitlist`, `/api/holidays`, `/api/calendar` — roles

- `waitlist`: `POST`/`GET /me`/`DELETE /:id` cualquiera; `GET /` `admin`,`doctor`,`superadmin`.
- `holidays`: `GET` `admin`,`doctor`,`superadmin`; `POST`/`DELETE` `admin`,`superadmin`.
- `calendar`: `GET /doctor/:doctorId/ics` → `doctor`,`admin`,`superadmin`.

## 4. Reglas de negocio clave

### 4.1 Validación de slot (`shared/booking-utils.ts`)
`validateBookingSlot` compone 4 chequeos en orden (`:119-125`):
1. `checkHolidayBlock` — feriado del tenant.
2. `checkDoctorAvailability` — dentro de un bloque de `doctor_availability` del día.
3. `checkDoctorExceptions` — excepción de día completo o por rango.
4. `checkSlotOverlap` — solape con otra cita `status != 'cancelled'` (+ `duration`).

### 4.2 Concurrencia anti-doble-reserva
Cada creación (autenticada, serie, invitado) y reprogramación abre transacción y toma `pg_advisory_xact_lock(doctor_id, hashtext(date))` (`booking.service.ts:387-390,606-609,126-129`; `guest.service.ts:57-60`), y captura `23505` como `BOOKING_SLOT_ALREADY_BOOKED`.

### 4.3 Máquina de estados (implícita)
- Se inserta siempre `confirmed = true` con `status` por defecto (`pending`).
- `confirmBooking` solo actúa sobre `confirmed = FALSE` (`booking.service.ts:705-708`) → **inalcanzable** para las citas que crea el propio sistema (FND-D2).
- Cancelación: `status = 'cancelled'` (`booking.service.ts:541`); reprogramación no cambia `status` (FND-D10).
- `booking_status_history` registra cada transición (`shared/booking-history.ts`).

### 4.4 Lista de espera
`notifyWaitlistForSlot` marca la entrada más antigua como `notified` con `FOR UPDATE SKIP LOCKED` (evita doble notificación) y encola email + notificación in-app (`waitlist.service.ts:135-187`). Se dispara al **cancelar** una cita (`booking.service.ts:558`), al **reprogramar** liberando la fecha original (`:671`) y al **crear un feriado** (`holidays.service.ts:145`).

### 4.5 Bloqueo de pacientes
`createBooking` rechaza pacientes con `users.blocked_until > NOW()` (`booking.service.ts:406-408`); el invitado se bloquea por RUT (`guest.service.ts:25-50`, columna `blocked_until`).

## 5. Acceso a datos

- Lecturas por `readPool`; escrituras/transacciones por `pool` (RLS activo).
- `bookings`, `booking_series`, `booking_status_history`, `doctor_availability`, `doctor_exceptions`, `waitlist`, `clinic_holidays` aíslan por `tenant_id` a nivel SQL.
- El **job de recordatorios** corre **fuera de un request**, sin contexto de tenant → cae al fallback RLS `'default'` (FND-D1).

## 6. Roles de los actores

| Rol | Puede |
|---|---|
| `patient`/`user` | Reservar, ver/reprogramar/cancelar **sus** citas, unirse a waitlist, ver slots |
| `doctor` | Definir su disponibilidad/excepciones, ver sus citas y densidad, exportar ICS, ver waitlist/feriados |
| `admin` | Ver todas las citas del tenant, gestionar feriados, disponibilidad masiva, waitlist |
| `superadmin` | Igual que admin; en `GET /all` intenta ver todo pero RLS lo limita a `'default'` (FND-D9) |
| **invitado** | Crear cita (RUT+email), consultar/cancelar por RUT+token |

## 7. Findings de SUB-6 (ver `05-findings.md`, FND-D1…D15)

Destacan: **FND-D1 🔴** (recordatorios solo del tenant `'default'`), **FND-D2 🟡** (flujo "confirmar cita" muerto), **FND-D4 🟡** (PHI pública por RUT), **FND-D6 🟡** (dos cancelaciones divergentes), **FND-D9 🟡** (superadmin limitado a `'default'`).

## 8. Notas de NO VERIFICADO

- Si el índice único `(doctor_id, user_id, requested_date)` que asume `joinWaitlist` (ON CONFLICT) existe en todas las migraciones (verificar en Fase 7).
- Zona horaria de producción: el negocio asume hora local de la clínica (Chile), pero el ICS serializa como UTC (FND-D13).
- Efecto real de FND-D1 en producción depende de si se despliega el cron (ver `render.yaml`).
- Cobertura de tests de concurrencia/slot (Fase 11).
