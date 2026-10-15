# SUB-11 — Inventario de archivos

## Archivos propios

| Archivo | LOC | Rol |
|---|---|---|
| `src/modules/saas/saas.routes.ts` | 47 | Rutas SaaS, `onboardLimiter` (3/h), `PUBLIC` (webhook/plans/onboard) + auth por rol |
| `src/modules/saas/saas.controller.ts` | 313 | Handlers SaaS; `pickProfile`; `verifyCaptchaOnboard`; `mercadopagoWebhook` |
| `src/modules/saas/saas.service.ts` | 675 | Planes, suscripciones, grace/past-due, límites, features, onboarding, reconciliación MP |
| `src/modules/saas/saas.schema.ts` | 48 | `checkoutSchema`, `changePlanSchema`, `onboardSchema` (`.strict()`) |
| `src/modules/saas/onboarding.service.ts` | 548 | Perfil `tenant_onboarding`, documentos `onboarding_documents`, aplicaciones |
| `src/modules/saas/onboarding.schema.ts` | 47 | Schemas de perfil/documentos/aplicaciones |
| `src/modules/billing/billing.routes.ts` | 19 | Rutas de facturas (allowlist de roles por endpoint) |
| `src/modules/billing/billing.controller.ts` | 80 | Handlers; ownership de factura por rol; `Idempotency-Key` |
| `src/modules/billing/billing.service.ts` | 252 | CRUD `invoices`/`invoice_items`, `idempotencyCache`, `getBillingStats` |
| `src/modules/billing/billing.schema.ts` | 33 | `createInvoiceSchema`, `updateInvoiceStatusSchema` (enum), `invoiceIdSchema` |
| `src/modules/super-admin/super-admin.routes.ts` | 39 | Router completo tras `authMiddleware` + `authorize('superadmin')` |
| `src/modules/super-admin/super-admin.controller.ts` | 159 | Handlers de tenants/usuarios/analítica |
| `src/modules/super-admin/super-admin.service.ts` | 815 | Analítica cross-tenant, `deleteTenant` (soft), `setUserActive`, billing summary |
| `src/modules/super-admin/super-admin.schema.ts` | 31 | `updateTenantSchema`, `adminCreateTenantSchema` |
| `src/modules/currencies/currencies.routes.ts` | 8 | `GET /rates` |
| `src/modules/currencies/currencies.controller.ts` | 12 | Handler de tasas (público) |
| `src/shared/currencies.ts` | 100 | Países/monedas, `FALLBACK_RATES`, `refreshRates`, `convertFromUsd` |
| `src/shared/mercadopago.service.ts` | 120 | `createCheckoutPreference`, `fetchPayment`, `isMercadoPagoConfigured` |

## Transversales consumidos

| Archivo | Rol |
|---|---|
| `src/app.ts:277-282` | Montaje de `billing`, `saas`, `currencies`, `super-admin` |
| `src/middlewares/tenant.middleware.ts:28-31` | `PUBLIC_PATHS` incluye `/api/saas/plans`, `/api/saas/onboard`, `/api/saas/webhook/mercadopago`, `/api/currencies/rates` |
| `src/shared/db.ts` | Pools `pool`/`readPool`/`superAdminPool` (BYPASSRLS) |
| `src/utils/error-codes.ts` | `E.SAAS_*`, `E.BILLING_*`, `E.MERCADOPAGO_*` |
| `src/shared/email.service.ts` | Notificaciones (SendGrid) |

## Tablas

`plans`, `subscriptions`, `subscription_invoices`, `invoices`, `invoice_items`, `tenant_features`, `tenant_usage`, `tenant_onboarding`, `onboarding_documents` (`db/init.sql`).

## Dependencias npm relevantes

Sin SDK externo para pagos: Mercado Pago vía `fetch` nativo. Usa `zod`, `express`, `express-rate-limit` (limiter de onboard), `bcrypt` (hash de admin en onboard), `crypto` (números de factura).

## Variables de entorno

`MERCADOPAGO_ACCESS_TOKEN`, `MERCADOPAGO_NOTIFICATION_URL` (opcional), `APP_LOCALE`; `RECAPTCHA_SECRET_KEY` (usada por `verifyCaptchaOnboard`).
