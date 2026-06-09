# Doctor

## Endpoints
- `GET /doctors` — Lista pública
- `POST /doctors` — Crear (admin)
- `GET /doctors/:id` — Perfil
- `GET /doctors/users` — Lista usuarios del tenant (admin)
- `PATCH /doctors/users/:id/active` — Activar/desactivar (admin)

## Features
- Al crear doctor, crea availability default (Lun-Vie 09:00-17:00)
- Gestión de usuarios del tenant con filtro por rol/búsqueda
- Toggle activate/deactivate
- Relación con tabla `users` via `user_id`
