# SUB-11 — Módulos y capas

| ID | Unidad | Tipo | Archivo | Responsabilidad | LOC |
|---|---|---|---|---|---|
| SUB11-U1 | saas.routes | Route | `src/modules/saas/saas.routes.ts` | Rutas SaaS + `onboardLimiter` + `PUBLIC`/auth por rol | 47 |
| SUB11-U2 | saas.controller | Controller | `src/modules/saas/saas.controller.ts` | Handlers SaaS, captcha onboard, webhook MP | 313 |
| SUB11-U3 | saas.service | Service | `src/modules/saas/saas.service.ts` | Planes, suscripciones, límites, features, reconciliación MP | 675 |
| SUB11-U4 | saas.schema | Schema (Zod) | `src/modules/saas/saas.schema.ts` | `checkoutSchema`, `changePlanSchema`, `onboardSchema` | 48 |
| SUB11-U5 | onboarding.service | Service | `src/modules/saas/onboarding.service.ts` | Perfil `tenant_onboarding` + documentos | 548 |
| SUB11-U6 | onboarding.schema | Schema (Zod) | `src/modules/saas/onboarding.schema.ts` | Perfil/documentos/aplicaciones | 47 |
| SUB11-U7 | billing.routes | Route | `src/modules/billing/billing.routes.ts` | Rutas de facturas | 19 |
| SUB11-U8 | billing.controller | Controller | `src/modules/billing/billing.controller.ts` | Handlers de facturas + ownership | 80 |
| SUB11-U9 | billing.service | Service | `src/modules/billing/billing.service.ts` | `invoices`/`invoice_items`, idempotencia, stats | 252 |
| SUB11-U10 | billing.schema | Schema (Zod) | `src/modules/billing/billing.schema.ts` | `createInvoice`, `updateInvoiceStatus`, `invoiceId` | 33 |
| SUB11-U11 | super-admin.routes | Route | `src/modules/super-admin/super-admin.routes.ts` | Rutas panel (todas `superadmin`) | 39 |
| SUB11-U12 | super-admin.controller | Controller | `src/modules/super-admin/super-admin.controller.ts` | Handlers analítica/admin | 159 |
| SUB11-U13 | super-admin.service | Service | `src/modules/super-admin/super-admin.service.ts` | Analítica cross-tenant + CRUD tenants/usuarios | 815 |
| SUB11-U14 | super-admin.schema | Schema (Zod) | `src/modules/super-admin/super-admin.schema.ts` | `updateTenant`, `adminCreateTenant` | 31 |
| SUB11-U15 | currencies.routes | Route | `src/modules/currencies/currencies.routes.ts` | `GET /rates` | 8 |
| SUB11-U16 | currencies.controller | Controller | `src/modules/currencies/currencies.controller.ts` | Handler de tasas | 12 |
| SUB11-U17 | currencies (shared) | Shared | `src/shared/currencies.ts` | Países/monedas, tasas, conversión USD | 100 |
| SUB11-U18 | mercadopago.service | Shared | `src/shared/mercadopago.service.ts` | Preferencias + `fetchPayment` | 120 |

## Patrón de capas

`routes.ts` (auth/rol + `validateZod`) → `controller.ts` (`asyncHandler`, resuelve tenant/rol) → `service.ts` (SQL inline + transacciones). Sin capa `repository/`. El acceso a BD usa `pool`/`readPool` (RLS, en request) o `superAdminPool` (BYPASSRLS, cross-tenant).

## Tipos clave

- `Plan`, `Subscription`, `SubscriptionWithPlan` (`saas.service.ts:8-43`).
- `InvoiceFilters`, `InvoiceInput` (`billing.service.ts:43-65`).
- `MercadoPagoPreference/Params/Payment` (`mercadopago.service.ts:3-27`).
- `SupportedCountry` (`currencies.ts:3-9`).

## Notas

- **SUB11-U3** concentra el dominio SaaS (675 L); mezcla planes, suscripciones, cuotas, features, onboarding-invocation y reconciliación MP.
- **SUB11-U13** (815 L) es el mayor del subsistema: analítica cross-tenant con SQL extenso por endpoint.
- **SUB11-U18** implementa Mercado Pago sin SDK (HTTP crudo) y degrada a stub/MVP sin credenciales.
