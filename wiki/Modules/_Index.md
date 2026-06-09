# Módulos

El backend sigue un patrón de **monolito modular** con 14 módulos + SaaS.

## Módulos Core

| Módulo | Descripción |
|--------|-------------|
| [[Modules/Auth\|Auth]] | Registro, login, JWT, 2FA, refresh tokens |
| [[Modules/Booking\|Booking]] | Reservas, slots, agenda doctores |
| [[Modules/Doctor\|Doctor]] | Perfiles, registro, gestión |
| [[Modules/Availability\|Availability]] | Bloques semanales (day_of_week) |
| [[Modules/Exception\|Exception]] | Bloques de excepción (full/partial day) |
| [[Modules/Guest\|Guest]] | Booking para invitados + búsqueda RUT |
| [[Modules/Confirmation\|Confirmation]] | Confirmación por email |

## Módulos de Datos

| Módulo | Descripción |
|--------|-------------|
| [[Modules/ClinicalRecord\|Clinical Record]] | EHR, recetas, CIE-10, PDF |
| [[Modules/Analytics\|Analytics]] | Dashboard, stats, integración ML |
| [[Modules/Billing\|Billing]] | Facturas, pagos, seguros |
| [[Modules/Laboratory\|Laboratory]] | Exámenes, solicitudes, resultados |

## Módulos de Sistema

| Módulo | Descripción |
|--------|-------------|
| [[Modules/Audit\|Audit]] | Logs de auditoría (admin) |
| [[Modules/RBAC\|RBAC]] | Permisos y roles |
| [[Modules/ML\|Machine Learning]] | Modelos TF.js |
| [[Modules/SaaS\|SaaS]] | Multi-tenant, planes, suscripciones |

## Estructura Común

```
module/
├── module.controller.ts   # asyncHandler wrappers
├── module.service.ts      # Lógica + queries DB
├── module.routes.ts       # Definición de rutas
├── module.schema.ts       # Schemas Zod
└── (opcional)
    ├── module.email.ts
    └── module.middleware.ts
```
