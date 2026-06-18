# Módulo Guest

> Booking para usuarios sin autenticación (invitados).

## Ubicación: `src/modules/guest/`

| Archivo | Propósito |
|---------|-----------|
| `guest.controller.ts` | Handlers de rutas |
| `guest.service.ts` | Lógica de booking invitado |
| `guest.routes.ts` | Definición de rutas |
| `guest.schema.ts` | Validación Zod |
| `guest.email.ts` | Plantillas de email |

## Endpoints: `/api/guest`

- `POST /booking` — Crear reserva como invitado (rate limit: 5/hora)
- `GET /bookings/:rut` — Consultar reservas por RUT (rate limit: 3/15min)
- `DELETE /booking/:id` — Cancelar reserva invitado

## Validación

- RUT chileno validado con algoritmo de módulo 11
- Requiere nombre, email y RUT del invitado
- No puede crear duplicados en mismo slot

---

Tags: #modulo #guest #invitados
