# Módulo Doctor

> Gestión de perfiles de doctores.

## Ubicación: `src/modules/doctor/`

| Archivo | Propósito |
|---------|-----------|
| `doctor.controller.ts` | Handlers de rutas |
| `doctor.service.ts` | CRUD de doctores, invitación |
| `doctor.routes.ts` | Definición de rutas |
| `doctor.schema.ts` | Validación Zod |
| `doctor.email.ts` | Plantillas de email para invitación |

## Endpoints: `/api/doctors`

- `GET /public` — Lista pública (cache 60s, sin auth)
- `GET /` — Lista interna (admin/superadmin)
- `POST /` — Crear doctor
- `POST /register` — Registrar doctor con usuario
- `POST /invite` — Enviar invitación por email
- `GET /me` — Perfil del doctor autenticado
- `GET /users` — Lista usuarios del tenant
- `PATCH /users/:userId/active` — Activar/desactivar usuario

## Relaciones

- Un doctor está asociado a un `user` (relación 1:1)
- Los doctores tienen disponibilidad semanal (ver [[02-BACKEND/Modulos/Availability|Availability]])

---

Tags: #modulo #doctor
