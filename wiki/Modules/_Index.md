# Módulos

El backend sigue un patrón de **monolito modular** con 23 módulos.

## Módulos Core

| Módulo | Descripción |
|--------|-------------|
| [[Modules/Auth\|Auth]] | Registro, login, JWT, 2FA, refresh tokens |
| [[Modules/Booking\|Booking]] | Reservas, slots, agenda doctores |
| [[Modules/Doctor\|Doctor]] | Perfiles, registro, gestión |
| [[Modules/Availability\|Availability]] | Bloques semanales (day_of_week) |
| [[Modules/Exception\|Exception]] | Bloques de excepción (full/partial day) |
| [[Modules/Guest\|Guest]] | Booking para invitados + búsqueda RUT |
| [[Modules/Patient\|Patient]] | Portal paciente (placeholder) |
| [[Modules/Specialties\|Specialties]] | Catálogo de especialidades médicas |

## Módulos de Datos Clínicos

| Módulo | Descripción |
|--------|-------------|
| [[Modules/ClinicalRecord\|Clinical Record]] | EHR, recetas, CIE-10, PDF |
| [[Modules/Laboratory\|Laboratory]] | Exámenes, solicitudes, resultados |
| [[Modules/FHIR\|FHIR]] | Interoperabilidad FHIR R4 |
| [[Modules/Compliance\|Compliance]] | GDPR, portabilidad, derecho al olvido |

## Módulos de Negocio

| Módulo | Descripción |
|--------|-------------|
| [[Modules/Analytics\|Analytics]] | Dashboard, stats, integración ML |
| [[Modules/Billing\|Billing]] | Facturas, pagos, seguros |
| [[Modules/SaaS\|SaaS]] | Multi-tenant, planes, suscripciones |

## Módulos de Sistema

| Módulo | Descripción |
|--------|-------------|
| [[Modules/Audit\|Audit]] | Logs de auditoría (admin) |
| [[Modules/RBAC\|RBAC]] | Permisos y roles |
| [[Modules/ML\|Machine Learning]] | Modelos TF.js |
| [[Modules/Monitoring\|Monitoring]] | Health checks, métricas, DB stats |
| [[Modules/Notification\|Notification]] | Notificaciones multicanal |
| [[Modules/Webhook\|Webhook]] | Webhooks salientes con HMAC |
| [[Modules/SuperAdmin\|Super Admin]] | Gestión global de tenants |
| [[Modules/I18n\|i18n]] | Traducciones multi-idioma |

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
