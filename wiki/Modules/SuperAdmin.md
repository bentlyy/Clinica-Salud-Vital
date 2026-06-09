# Super Admin

Gestión global de tenants para el rol `superadmin`.

## Endpoints
- `GET /super-admin/stats` — Estadísticas globales
- `GET /super-admin/tenants` — Lista de tenants
- `POST /super-admin/tenants` — Crear tenant
- `GET /super-admin/tenants/:id` — Detalle
- `PATCH /super-admin/tenants/:id` — Editar
- `DELETE /super-admin/tenants/:id` — Eliminar

## Features
- Acceso global a todos los tenants
- Frontend: `/super-admin/` dashboard, `/super-admin/tenants` lista
- Rol `superadmin` con bypass de tenant isolation
