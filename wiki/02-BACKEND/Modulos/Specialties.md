# Módulo Specialties

> Catálogo de especialidades médicas.

## Ubicación: `src/modules/specialties/`

| Archivo | Propósito |
|---------|-----------|
| `specialties.controller.ts` | Handlers de rutas |
| `specialties.service.ts` | CRUD de especialidades |
| `specialties.routes.ts` | Definición de rutas |

## Endpoints: `/api/specialties`

- `GET /` — Listar especialidades (público)
- `GET /:id` — Detalle de especialidad (público)
- `POST /` — Crear especialidad (admin/superadmin)
- `PUT /:id` — Actualizar especialidad
- `DELETE /:id` — Eliminar especialidad

## Datos Precargados

12 especialidades con iconos, descripciones, procedimientos y colores:
Cardiología, Dermatología, Neurología, Pediatría, Medicina General, Ginecología, Traumatología, Oftalmología, Psiquiatría, Endocrinología, Urología, Reumatología.

---

Tags: #modulo #specialties #especialidades
