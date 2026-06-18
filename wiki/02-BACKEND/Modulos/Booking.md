# Módulo Booking

> Gestión de reservas de citas médicas.

## Ubicación: `src/modules/booking/`

| Archivo | Propósito |
|---------|-----------|
| `booking.controller.ts` | Handlers de rutas |
| `booking.service.ts` | Lógica de reservas, slots, advisory locks |
| `booking.routes.ts` | Definición de rutas |
| `booking.schema.ts` | Validación Zod |
| `booking.email.ts` | Plantillas de confirmación |

## Endpoints: `/api/bookings`

- `POST /` — Crear reserva (auth requerido)
- `GET /me` — Reservas del usuario autenticado
- `DELETE /:id` — Cancelar reserva
- `GET /available-slots` — Slots disponibles (público)
- `GET /doctor/daily-density` — Densidad diaria (doctor)
- `GET /doctor` — Agenda del doctor
- `GET /all` — Todas las reservas (admin)

## Race Condition Prevention

Usa `pg_advisory_xact_lock()` para evitar dobles reservas en el mismo slot:

```sql
SELECT pg_advisory_xact_lock(hashtext(CONCAT(doctor_id, '-', date, '-', time)));
```

## Estados de Booking

- `pending` → `confirmed` → `completed` | `cancelled`

---

Tags: #modulo #booking #reservas
