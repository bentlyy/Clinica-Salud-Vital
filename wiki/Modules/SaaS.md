# SaaS / Multi-tenant

## Arquitectura
- Shared DB con `tenant_id` en todas las tablas
- Carga de tenants al startup, refresh cada 5 min
- Aislamiento via `WHERE tenant_id = ?` en todas las queries

## Planes
| Plan | Código | Precio | Doctores | Pacientes |
|------|--------|--------|----------|-----------|
| Gratuito | free | $0 | 1 | 50 |
| Básico | basic | $29/mes | 3 | 200 |
| Profesional | pro | $79/mes | 10 | ∞ |
| Enterprise | enterprise | $199/mes | ∞ | ∞ |

## Features
- **Feature gating**: `checkFeatureAccess(tenantId, featureKey)`
- **Límites**: `checkLimits(tenantId, resource)`
- **Stripe**: checkout sessions + webhooks (stub sin key)
- **Onboarding**: POST `/saas/onboard` → tenant + trial + admin user

## Endpoints
- `POST /saas/onboard` — Crear tenant + admin
- `POST /saas/checkout` — Stripe checkout session
- Frontend wizard 3 pasos: info → credenciales → plan
