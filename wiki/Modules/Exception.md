# Exception

Bloques de excepción que anulan la disponibilidad regular.

## Tipos
- **Full day** — Todo el día sin atención
- **Partial** — Rango horario específico sin atención

## Relaciones
- Asociado a `doctor_id`
- Se valida contra availability al calcular slots
- Usado por [[Modules/Booking|Booking]] y [[Modules/Guest|Guest]] para validación
