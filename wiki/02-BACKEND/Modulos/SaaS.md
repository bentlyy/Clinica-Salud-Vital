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
| POST | `webhook/mercadopago` | ❌ | Webhook de Mercado Pago (Checkout Pro) |
| GET | `plans` | ❌ | Lista de planes públicos |
| POST | `onboard` | 3/hora | Onboarding de tenant |
| GET | `features` | ❌ | Features habilitadas |
| GET | `subscription` | admin | Suscripción actual |
| POST | `checkout` | admin | Crear preferencia de pago Mercado Pago |
| POST | `change-plan` | admin | Cambiar de plan |
| POST | `cancel` | admin | Cancelar suscripción |
| GET | `usage` | admin | Uso del tenant |
| GET | `usage/summary` | admin | Resumen de uso |
| GET | `limits` | admin | Límites del plan actual |
| PATCH | `tenant` | admin | Actualizar tenant |

## Planes (CLP)

| Plan | Mensual | Anual | Doctores | Pacientes |
|------|---------|-------|----------|-----------|
| Free | $0 | $0 | 1 | 50 |
| Basic | $9.990 | $99.990 | 3 | 200 |
| Pro | $19.990 | $199.900 | 10 | Ilimitado |
| Enterprise | $39.990 | $399.900 | Ilimitado | Ilimitado |

> Nota: los precios viven en `plans.price_monthly_clp` / `plans.price_yearly_clp`
> (currency `CLP`, entero sin decimales). Las columnas `price_monthly`/`price_yearly`
> (USD) se conservan por compatibilidad pero no se usan para cobro.

## Integración: Mercado Pago (Chile)

- `src/shared/mercadopago.service.ts` crea preferencias Checkout Pro contra
  `https://api.mercadopago.com/checkout/preferences` con `MERCADOPAGO_ACCESS_TOKEN`.
- Si no hay token (p. ej. dev local), `createCheckout` cae al modo **MVP**: crea la
  suscripción directamente y devuelve una URL simulada.
- El webhook **nunca confía en el payload**: resuelve el pago con
  `GET /v1/payments/{id}` y solo concilia pagos `status === 'approved'` con
  `handleMercadoPagoPaymentApproved` (idempotente vía `mercadopago_payment_id`).
- `external_reference` = `tenant_id`; `metadata.plan_code` = código del plan.

## Feature Flags

Cada módulo puede estar habilitado/deshabilitado por plan:
- `laboratory`, `analytics`, `api_access`, `white_label`, `sms`, `advanced_reports`

---

Tags: #modulo #saas #multi-tenant