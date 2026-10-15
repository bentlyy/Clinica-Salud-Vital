# SUB-11 — Billing / SaaS

> **Estado:** descripción AS-IS completada · **Certeza global:** confirmado (lectura de código).
> **Evidencia principal:** `src/modules/saas/*`, `src/modules/billing/*`, `src/modules/super-admin/*`, `src/modules/currencies/*`, `src/shared/{mercadopago.service,currencies}.ts`; `src/app.ts:277-282`; `db/init.sql` (`plans`, `subscriptions`, `subscription_invoices`, `invoices`, `invoice_items`, `tenant_features`, `tenant_usage`, `tenant_onboarding`, `onboarding_documents`).

## 1. Propósito

Gestionar el ciclo comercial del SaaS multi-tenant: **catálogo de planes**, **onboarding** de nuevas clínicas, **suscripciones** y su facturación (Mercado Pago o modo MVP), **facturas locales** (invoices) por tenant, **límites/cuotas** de uso, **features por plan** y el **panel SuperAdmin** de analítica cross-tenant. Incluye conversión de precios USD → moneda local.

Es un subsistema de **plataforma** (no de clínica): la mayoría de sus escrituras críticas se hacen con `superAdminPool` (BYPASSRLS), porque operan cross-tenant (webhooks, jobs, onboard, panel).

## 2. Componentes

| Capa | Módulo | Rol |
|---|---|---|
| HTTP plataforma | `saas.routes/controller/service` | Planes, checkout, cambio/cancelación, onboarding, límites, features, config de tenant |
| Onboarding | `saas/onboarding.service.ts` | Perfil de incorporación (`tenant_onboarding`) y documentos (`onboarding_documents`) |
| Facturación local | `billing.routes/controller/service` | CRUD de `invoices`/`invoice_items` + stats + idempotencia |
| SuperAdmin | `super-admin.routes/controller/service` | Analítica global, tenants, usuarios, billing summary, salud |
| Moneda | `currencies.routes/controller` + `shared/currencies.ts` | Tasas USD→local (open.er-api) + fallback |
| Pasarela | `shared/mercadopago.service.ts` | Preferencias Checkout Pro + consulta de pagos |

## 3. Superficie HTTP (`API_PREFIX = /api`)

### 3.1 SaaS — `src/modules/saas/saas.routes.ts` (montado en `app.ts:280`)

| Método | Ruta | Auth/rol | Notas |
|---|---|---|---|
| POST | `/api/saas/webhook/mercadopago` | **público** (urlencoded) | Sin firma; re-consulta el pago (ver FND-H4) |
| GET | `/api/saas/plans` | **público** | Planes activos |
| POST | `/api/saas/onboard` | **público** + `onboardLimiter` (3/hora/ip) + captcha | Crea tenant + admin + suscripción (FND-H1) |
| GET | `/api/saas/subscription` | admin, superadmin | |
| POST | `/api/saas/checkout` | admin, superadmin | MP o modo MVP (FND-H1) |
| POST | `/api/saas/change-plan` | admin, superadmin | Factura `paid` sin cobro (FND-H2) |
| POST | `/api/saas/cancel` | admin, superadmin | |
| GET | `/api/saas/usage` · `/usage/summary` | admin, superadmin | |
| GET | `/api/saas/limits` | admin, superadmin | |
| GET | `/api/saas/features` | **cualquier autenticado** | Sin `authorize` |
| PATCH | `/api/saas/tenant` | admin, superadmin | Config de tenant |
| GET/PATCH | `/api/saas/onboarding` | admin, superadmin | Perfil |
| POST/GET/DELETE | `/api/saas/onboarding/documents[/:id]` | admin, superadmin | Documentos |
| GET/PATCH | `/api/saas/onboarding/applications[...]` | **superadmin** | Panel de aplicaciones |

### 3.2 Billing — `src/modules/billing/billing.routes.ts` (montado en `app.ts:277`)

| Método | Ruta | Roles |
|---|---|---|
| GET | `/api/billing` | admin, superadmin, doctor, user, patient (filtrado por rol) |
| GET | `/api/billing/stats` | admin, superadmin, doctor (**sin scope a doctor**, FND-H10) |
| GET | `/api/billing/:id` | admin, superadmin, doctor, user, patient (ownership en controller) |
| POST | `/api/billing` | admin, superadmin, doctor (+`Idempotency-Key`) |
| PATCH | `/api/billing/:id/status` | admin, superadmin |
| DELETE | `/api/billing/:id` | admin, superadmin, doctor |

### 3.3 SuperAdmin — `src/modules/super-admin/super-admin.routes.ts` (montado en `app.ts:282`)

Todo el router exige `authMiddleware` + `authorize('superadmin')`. Expone `/stats`, `/tenants[...]`, `/users`, `/billing`, y 12 endpoints `/analytics/*` (dashboard, top-tenants, revenue, growth, health, operations, churn, comparison, occupancy, activity, alerts). `deleteTenant` exige `confirm:true` y hace soft-delete.

### 3.4 Currencies — `src/modules/currencies/currencies.routes.ts` (montado en `app.ts:281`)

`GET /api/currencies/rates` — **público** (sin auth/tenant); lo consume la landing.

## 4. Roles/actores

- **admin** (de tenant): gestiona suscripción/facturas/onboarding/config de su clínica.
- **superadmin**: cross-tenant; panel de analítica y administración de tenants/usuarios.
- **doctor**: crea/edita facturas y ve las suyas (+stats globales del tenant, FND-H10).
- **user/patient**: ve únicamente sus propias facturas.
- **Público**: planes, tasas de cambio, webhook MP y onboarding de nuevas clínicas.

## 5. Acceso a datos

- **`superAdminPool` (BYPASSRLS):** `createSubscription`, `changePlan`, `cancelSubscription`, `handlePastDueSubscriptions`, `recordUsage`, `updateTenantConfig`, `onboardTenant`, `activateSubscriptionForPayment`, `findSubscriptionByMpPaymentId` (webhook/job cross-tenant).
- **`pool`/`readPool` (RLS):** lecturas dentro de request (`getPlans`, `getTenantCurrency`, `billing.getInvoices/ById`, `getBillingStats`, `checkLimits`, `getTenantUsage`, `checkFeatureAccess`).
- **Tablas propias:** `plans`, `subscriptions`, `subscription_invoices`, `invoices`, `invoice_items`, `tenant_features`, `tenant_usage`, `tenant_onboarding`, `onboarding_documents`.
- Las tablas SaaS están en `KNOWN_LEAKING` del test RLS (**FND-B1**); escrituras SaaS fueron debilitadas por migración 021 (**FND-B5**).

## 6. Integraciones y reglas

- **Mercado Pago (Checkout Pro):** preferencias y consulta de pago vía HTTP crudo (`fetch`, timeout 12 s), sin SDK. Si `MERCADOPAGO_ACCESS_TOKEN` falta → **modo stub/MVP** (activación directa sin pago).
- **Tasas de cambio:** `open.er-api.com` sin key; caché en proceso + `FALLBACK_RATES` estáticas (FND-H12).
- **Feature flags:** resolución por `tenant_features` → fallback a `plans.features` → `'false'` (una sola query en `checkFeatureAccess`; N+1 en `getTenantFeatures`, FND-H13).
- **Cuotas:** `tenant_usage` acumulada por mes; `checkLimits` compara `doctors/patients/storage` contra el plan.

## 7. Findings de SUB-11 (ver `05-findings.md`, FND-H1…H14)

Destacan: **FND-H1 🟡** (checkout MVP activa plan de pago sin pago), **FND-H2 🟡** (`changePlan` factura `paid` sin cobro), **FND-H3 🟡** (flujo de gracia `past_due` inalcanzable), **FND-H4 🟡** (webhook sin verificación de firma), **FND-H5 🟡** (idempotencia en memoria).

Positivos: transacciones cross-tenant con `superAdminPool` + `FOR UPDATE`/advisory; idempotencia de webhook por `mercadopago_payment_id`; el webhook **no** confía en el payload (re-consulta el pago); validación Zod estricta de dominio/email/password en onboard; índice único de suscripción activa.

## 8. Notas de NO VERIFICADO

- Si `MERCADOPAGO_ACCESS_TOKEN` está configurado en producción (sin él, todo el pago es MVP → FND-H1).
- Contenido real de `db/seeds/*` para `plans`/`tenant_features` (precios y flags efectivos).
- Almacenamiento físico de documentos de onboarding (ruta en disco) y su persistencia entre despliegues.
- Si `past_due` se fija desde fuera del código (p. ej. operación manual en BD) — de lo contrario FND-H3 es código muerto.
- Nº de instancias en producción (efecto real de FND-H5, FND-F5).
