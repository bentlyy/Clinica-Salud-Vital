# Módulo Availability

> Gestión de disponibilidad semanal y excepciones de doctores.

## Ubicación: `src/modules/availability/`

| Archivo | Propósito |
|---------|-----------|
| `availability.controller.ts` | Handlers de disponibilidad |
| `availability.service.ts` | Lógica de bloques semanales |
| `availability.routes.ts` | Rutas de disponibilidad |
| `availability.schema.ts` | Validación Zod |
| exception routes (en mismo módulo) | Rutas de excepciones |

## Disponibilidad Semanal: `/api/availability`

- `GET /me` — Mi disponibilidad (doctor)
- `GET /:id` — Disponibilidad de un doctor (público)
- `POST /` — Crear bloque de disponibilidad
- `DELETE /:id` — Eliminar bloque

## Excepciones: `/api/exceptions`

- `GET /me` — Mis excepciones
- `POST /` — Crear excepción (full day o partial)
- `DELETE /:id` — Eliminar excepción

## Modelo

- `doctor_availability`: day_of_week (1-7), start_time, end_time
- `doctor_exceptions`: date, start_time, end_time, is_full_day

Las excepciones tienen prioridad sobre la disponibilidad semanal.

---

Tags: #modulo #availability #disponibilidad
