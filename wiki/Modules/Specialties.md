# Specialties

Catálogo de especialidades médicas.

## Endpoints
- `GET /specialties` — Lista pública (orden alfabético)
- `POST /specialties` — Crear especialidad (admin)

## Features
- Nombre con unique constraint
- Validación Zod en creación
- Helper `ensureSpecialty()` para upsert desde otros módulos
- Usado por doctores para asignar especialidad
