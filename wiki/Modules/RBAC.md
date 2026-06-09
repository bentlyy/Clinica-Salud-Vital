# RBAC (Roles y Permisos)

## Roles
| Rol | Acceso |
|-----|--------|
| `superadmin` | Global, todos los tenants |
| `admin` | Full del tenant |
| `doctor` | EHR, recetas, agenda |
| `user` | Bookings, perfil propio |

## Permisos
- Tablas: `permissions`, `role_permissions`, `user_permissions`
- Middleware `authorizeRoles('admin', 'doctor')`
- Granularidad por entidad/operación
