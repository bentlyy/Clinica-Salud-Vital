# SUB-11 — Diagramas

Índice de diagramas (Mermaid) del subsistema Billing / SaaS.

> Vista de datos: `[[../database/overview]]` · Multi-tenancy: `[[../multi-tenancy/overview]]` · Contexto: `[[../../01-system-context]]`

## D1. Módulos y tablas

```mermaid
flowchart TD
  subgraph HTTP
    SR[saas.routes/controller] --> SS[saas.service]
    BR[billing.routes/controller] --> BS[billing.service]
    SAR[super-admin.routes/controller] --> SAS[super-admin.service]
    CR[currencies.controller] --> CU[shared/currencies]
  end
  SS --> MP[shared/mercadopago.service]
  SS --> DBp[(plans / subscriptions / subscription_invoices)]
  SS --> ONB[(tenant_features / tenant_usage / tenant_onboarding)]
  BS --> INV[(invoices / invoice_items)]
  SAS --> DBp
  MP --> EXT[api.mercadopago.com]
  CU --> EXT2[open.er-api.com]
```

## D2. Activación de suscripción (dos caminos)

```mermaid
flowchart TD
  CO[POST /saas/checkout] --> Q{¿MercadoPago configurado?}
  Q -- sí --> PREF[createCheckoutPreference] --> INIT[init_point -> usuario paga]
  INIT --> WH[webhook /saas/webhook/mercadopago]
  WH --> FP[fetchPayment - re-consulta]
  FP --> AP{status approved?}
  AP -- sí --> ACT[activateSubscriptionForPayment: status=active]
  AP -- no --> NOOP[sin acción]
  Q -- no (MVP) --> DIRECT[createSubscription directo]
  DIRECT --> FREE[subscription active + factura paid SIN pago FND-H1]
```

## D3. Ciclo de vida de suscripción (estados)

```mermaid
stateDiagram-v2
  [*] --> trialing: onboard/createSubscription con trial
  [*] --> active: createSubscription sin trial / webhook / MVP
  trialing --> active: fin de trial (no implementado - sin transición)
  active --> canceled: cancelSubscription / grace expired
  trialing --> canceled: cancelSubscription
  active --> past_due: (NADIE escribe este estado - FND-H3)
  past_due --> canceled: handlePastDueSubscriptions (gracia vencida)
  past_due --> active: pago reconciliado
  canceled --> [*]
```

## D4. Infraestructura de cobro y reconciliación

```mermaid
flowchart LR
  TENANT[admin de tenant] -->|checkout| MPAPI[Mercado Pago Checkout Pro]
  MPAPI -->|notification| WH[webhook público]
  WH -->|fetchPayment| MPAPI
  WH -->|approved| RECON[reconciliación idempotente]
  RECON -->|superAdminPool BYPASSRLS| SUBS[(subscriptions + subscription_invoices)]
  CRON[cron] -->|handlePastDueSubscriptions| SUBS
  SUBS -->|getTenantPlan| LIMITS[límites y features]
```
