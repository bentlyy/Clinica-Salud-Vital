# Multi-Tenancy

> Estrategia de multi-tenencia con base de datos compartida.

## Modelo

Base de datos compartida con columna `tenant_id` en todas las tablas. Aislamiento lógico vía cláusulas `WHERE tenant_id = ?`.

## Resolución del Tenant

El tenant se resuelve en este orden:

1. Header `X-Tenant-Id` en la petición
2. Desde el JWT del usuario (`req.user.tenant_id`)
3. Valor por defecto: `default`

El middleware `tenant.middleware.ts` inyecta `req.tenant_id` y `req.locale` antes de llegar a los controladores.

## Tabla `tenants`

| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | TEXT PK | Identificador único |
| name | TEXT | Nombre del tenant |
| domain | TEXT UNIQUE | Dominio asociado |
| locale | TEXT DEFAULT 'es' | Idioma por defecto |
| timezone | TEXT | Zona horaria |
| config | JSONB | Configuración adicional |
| active | BOOLEAN | Si está activo |
| deleted_at | TIMESTAMPTZ | Soft delete |

## Planes SaaS

| Plan | Precio/mes | Máx doctores | Máx pacientes | Almacenamiento |
|------|-----------|-------------|---------------|----------------|
| Gratuito | $0 | 1 | 50 | 1 GB |
| Básico | $29 | 3 | 200 | 5 GB |
| Profesional | $79 | 10 | Ilimitado | 20 GB |
| Enterprise | $199 | Ilimitado | Ilimitado | 100 GB |

### Features por plan

- **Gratuito**: Solo booking
- **Básico**: Booking + clinical records + analytics
- **Profesional**: Todo + laboratorio + API + SMS
- **Enterprise**: Todo + white label + dominio personalizado

## Refresh de Tenants

El servicio `multi-tenant.service.ts` refresca la lista de tenants desde DB cada 5 minutos.

---

Tags: #multi-tenancy #saas #arquitectura
