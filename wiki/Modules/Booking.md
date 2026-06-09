# Booking

## Endpoints
- `GET /bookings` — Lista paginada
- `POST /bookings` — Crear reserva (auto-confirmada)
- `GET /bookings/:id` — Detalle
- `PATCH /bookings/:id` — Actualizar
- `DELETE /bookings/:id` — Cancelar
- `GET /bookings/slots` — Slots disponibles

## Features
- **Auto-confirmado**: las reservas se crean con `confirmed = true`
- Email de notificación con detalles y link para cancelar/reagendar
- Validación de slots (availability + exceptions + overlap) via `booking-utils.ts`
- Race conditions manejadas con PostgreSQL advisory locks
- Búsqueda de slots por doctor, fecha, duración
- Integración con [[Modules/Guest|Guest]] para booking sin registro

## Flujo
1. GET `/bookings/slots?doctorId=&date=` → slots disponibles
2. POST `/bookings` → crea booking + envía email notificación
3. Email incluye: doctor, fecha, hora, link cancelar
