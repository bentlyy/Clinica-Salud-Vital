# Módulo Super Admin

> Panel de administración global para gestión de tenants.

## Ubicación: `src/modules/super-admin/`

| Archivo | Propósito |
|---------|-----------|
| `super-admin.controller.ts` | Handlers de rutas |
| `super-admin.service.ts` | Lógica de administración global |
| `super-admin.routes.ts` | Definición de rutas |
| `super-admin.schema.ts` | Validación Zod |

## Endpoints: `/api/super-admin`

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `stats` | Estadísticas globales |
| GET | `analytics/dashboard` | Dashboard multi-tenant |
| GET | `analytics/top-tenants` | Tenants con más actividad |
| GET | `analytics/revenue` | Ingresos globales |
| GET | `analytics/growth` | Crecimiento de plataforma |
| GET | `tenants` | Listar todos los tenants |
| GET | `tenants/:id` | Detalle de tenant |
| POST | `tenants` | Crear tenant |
| PATCH | `tenants/:id` | Actualizar tenant |
| DELETE | `tenants/:id` | Eliminar tenant |
| GET | `users` | Listar usuarios globales |
| PATCH | `users/:userId/active` | Activar/desactivar usuario |

## Rol: `superadmin`

- Acceso exclusivo para administradores de la plataforma
- No está ligado a un tenant específico
- Puede gestionar todos los tenants del sistema

---

Tags: #modulo #super-admin #admin
