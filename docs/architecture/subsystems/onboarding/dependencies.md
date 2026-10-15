# SUB-19 — Dependencias (Onboarding público, aplicaciones y legal)

## Backend
- **Rutas:** `express.Router`, `express-rate-limit` (`onboardLimiter` 3/h/IP),
  `express.urlencoded` (solo webhook MP).
- **Validación:** `zod` vía `validateZod` (`saas.schema.onboardSchema`,
  `onboarding.schema.*`).
- **Auth:** `authMiddleware`, `authorize` (`auth.middleware`).
- **BD:** `superAdminPool` (`shared/db`) — bypassa RLS para el alta pública;
  `pool` con ALS para el resto.
- **Cifrado:** `bcrypt` (hash de `admin_password`, coste 12, import dinámico).
- **Archivos:** `node:fs/promises`, `node:path`, `node:crypto` (`randomBytes`) y
  `UPLOAD_ROOT` para documentos de onboarding.
- **Captcha:** `fetch` a `https://www.google.com/recaptcha/api/siteverify`
  (`AbortSignal.timeout(5000)`), opcional.
- **Multi-tenant:** `tenantService.loadFromDB()` tras el alta.
- **Errores/códigos:** `BadRequestError`, `E.SAAS_*`, `logger`.

## Frontend
- **UI:** MUI 6 (`Stepper/Step/StepLabel`, `Dialog`, `Tabs`, `Table`, `Paper`,
  `LinearProgress`, `Snackbar`, `Select`, `TextField`, `Chip`).
- **Formularios:** `react-hook-form` + `Controller`.
- **i18n:** `react-i18next` — namespaces `onboarding`, `landing`, `thanks`, `legal`,
  `common`.
- **Captcha:** `react-google-recaptcha` + `@/shared/utils/captcha`
  (`RECAPTCHA_SITE_KEY`, `isTestCaptcha`).
- **Routing:** `react-router-dom` (`useNavigate`, `Link`).
- **Precios:** `@/shared/hooks/usePricing` (`useSelectedCountry`, `useExchangeRates`,
  `usePricingContext`), `@/shared/utils/pricing`, `@/shared/services/pricing.service`.
- **Sesión (landing):** `@/shared/providers/AuthProvider` (`useAuth().login`),
  `@/shared/utils/role.utils` (`getRedirectPath`), `@/shared/config/demo`.
- **SEO:** `@/shared/components/Seo`.
- **API:** `@/shared/services/api-client` (Axios + interceptores).

## Grafo interno (backend)
```
saas.routes.ts
  ├─ onboardSchema (saas.schema.ts)              → validateZod
  ├─ onboarding.schema.ts                        → validateZod
  └─ saas.controller.ts
        ├─ verifyCaptchaOnboard (fetch recaptcha)
        ├─ saas.service.onboardTenant
        │     ├─ superAdminPool (BEGIN/COMMIT)
        │     ├─ getPlanByCode / convertFromUsd
        │     ├─ bcrypt (hash)
        │     ├─ onboarding.service.insertOnboarding
        │     │      └─ computeCompleteness / serializeValue
        │     ├─ onboarding.service.insertOnboardingDocuments
        │     │      └─ insertOnboardingDocumentFile (fs + onboarding_documents)
        │     └─ tenantService.loadFromDB
        └─ onboarding.service (perfil/documentos/aplicaciones)
              ├─ getOnboardingForTenant / upsertOnboardingProfile
              ├─ upload/get/list/deleteOnboardingDocument
              └─ approve/rejectOnboardingApplication
```

## Cross-dependencias entre subsistemas
- **SUB-11 (billing):** `onboardTenant` reutiliza el catálogo de planes y crea
  `subscriptions`/`subscription_invoices` (FND-H1/H2/H9).
- **SUB-3 (multi-tenancy):** el alta usa `superAdminPool` (bypass RLS) y toca
  `tenants`/`users`; el perfil autenticado pasa por RLS.
- **SUB-18 (seeds):** `seedTestTenants` (FND-P2) comparte superficie con onboarding.
- **SUB-4 (seguridad):** captcha (FND-F1) y límites de body (FND-K1).
- **SUB-1 (frontend):** la landing reutiliza `AuthProvider` (FND-R11) y la SPA provee
  el router lazy.
