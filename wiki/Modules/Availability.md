# Availability

Bloques de disponibilidad semanal para doctores.

## Schema
- `day_of_week` (0-6)
- `start_time`, `end_time`
- `slot_duration` (minutos)
- Asociado a `doctor_id`
- Default al crear doctor: Lun-Vie 09:00-17:00

## Endpoints (dentro de doctor)
- Gestión de horarios semanales
- Validación contra exceptions
