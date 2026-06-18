# Módulo SaaS

> Gestión multi-tenant, planes, suscripciones y facturación SaaS.

## Ubicación: `src/modules/saas/`

| Archivo | Propósito |
|---------|-----------|
| `saas.controller.ts` | Handlers de rutas |
| `saas.service.ts` | Lógica de planes, suscripciones, límites |
| `saas.routes.ts` | Definición de rutas |
| `saas.schema.ts` | Validación Zod |

## Endpoints: `/api/saas`

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `webhook/stripe` | ❌ | Webhook de Stripe |
| GET | `plans` | ❌ | Lista de planes públicos |
| POST | `onboard` | 3/hora | Onboarding de tenant |
| GET | `features` | ❌ | Features habilitadas |
| GET | `subscription` | admin | Suscripción actual |
| POST | `checkout` | admin | Crear sesión de checkout Stripe |
| POST | `change-plan` | admin | Cambiar de plan |
| POST | `cancel` | admin | Cancelar suscripción |
| GET | `usage` | admin | Uso del tenant |
| GET | `usage/summary` | admin | Resumen de uso |
| GET | `limits` | admin | Límites del plan actual |
| PATCH | `tenant` | admin | Actualizar tenant |

## Planes

| Plan | Precio | Doctores | Pacientes |
|------|--------|----------|-----------|
| Free | $0 | 1 | 50 |
| Basic | $29/mes | 3 | 200 |
| Pro | $79/mes | 10 | Ilimitado |
| Enterprise | $199/mes | Ilimitado | Ilimitado |

## Feature Flags

Cada módulo puede estar habilitado/deshabilitado por plan:
- `laboratory`, `analytics`, `api_access`, `white_label`, `sms`, `advanced_reports`

---

Tags: #modulo #saas #multi-tenant
