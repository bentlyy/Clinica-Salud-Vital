# SUB-11 — Dependencias

## Aristas internas

| Origen | → Destino | Tipo | Evidencia |
|---|---|---|---|
| `saas.controller` | `saas.service` | call | `saas.controller.ts:3` |
| `saas.controller` | `onboarding.service` | call | `saas.controller.ts:4,208-253` |
| `saas.controller` | `shared/mercadopago.service` | call | `saas.controller.ts:9-13,55,108` |
| `saas.controller` | `shared/currencies` | call | `saas.controller.ts:8,60` |
| `saas.service` | `shared/db` (`pool`,`superAdminPool`) | query | `saas.service.ts:1` |
| `saas.service` | `onboarding.service` | call | `saas.service.ts:6,538-556` |
| `saas.service` | `shared/currencies` | call | `saas.service.ts:5,134,528` |
| `saas.service` | `shared/multi-tenant.service` | call | `saas.service.ts:561` (reload cache) |
| `billing.controller` | `billing.service` | call | `billing.controller.ts:1` |
| `billing.controller` | `doctor.service` | call | `billing.controller.ts:2,22,49` |
| `billing.service` | `shared/db` (`pool`,`readPool`) | query | `billing.service.ts:1` |
| `super-admin.controller` | `super-admin.service` | call | `super-admin.controller.ts:3` |
| `currencies.controller` | `shared/currencies` | call | `currencies.controller.ts:3` |
| `mercadopago.service` | `utils/logger` | import | `mercadopago.service.ts:1` |
| `currencies` | `utils/logger` | import | `currencies.ts:1` |

## Depende de

- **SUB-15 (BD):** tablas SaaS/billing + pools (`superAdminPool` BYPASSRLS para cross-tenant).
- **SUB-3 (multi-tenancy):** `req.tenant_id`; RLS en lecturas dentro de request; `PUBLIC_PATHS`.
- **SUB-2 (auth):** `authMiddleware`/`authorize` en todas las rutas protegidas; `bcrypt` en onboard.
- **SUB-4 (seguridad):** captcha (`RECAPTCHA_SECRET_KEY`), limiters, CSRF.
- **SUB-5/SaaS externo:** Mercado Pago (`api.mercadopago.com`), `open.er-api.com`.

## Es dependido por

- **Frontend:** páginas de planes/checkout/onboarding/facturas/panel superadmin; landing consume `/api/currencies/rates`.
- **`feature.middleware` / módulos de negocio:** `checkFeatureAccess` condiciona features por tenant.
- **Jobs:** `handlePastDueSubscriptions` (cron) degrada suscripciones vencidas.
- **Tests:** RLS (`subscriptions`, `subscription_invoices`, `tenant_features`, `tenant_usage`, `onboarding_documents` en `KNOWN_LEAKING`).

## Acoplamientos detectables

- Escrituras SaaS sin RLS dependen de que **siempre** se use `superAdminPool`; migración 021 permite escritura al rol de app (FND-B5).
- La activación de suscripción tiene **dos caminos** (webhook MP y modo MVP directo) con reglas distintas (FND-H1).
- `getTenantFeatures` acopla 9 lecturas por request (FND-H13/FND-B8).
- Precios en USD con conversión a moneda local gobernada por tasas en caché (FND-H12).
