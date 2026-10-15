# SUB-19 — Módulos (Onboarding público, aplicaciones y legal)

> Unidad `SUB19-Ux`: bloques funcionales. Unidades frontend de dominio `MOD-f-*`
> (ver `catalog/modules.csv`). Rutas públicas salvo las indicadas.

## U1 — Landing de marketing (`modules/landing`)
- **Archivo:** `LandingPage.tsx` (998L) + `LandingPage.css` (2059L).
- **Contenido:** hero, features, "tech", cómo funciona, precios, testimonios, FAQ, footer.
- **Precios:** `PRICING_PLANS` hardcodeado (`usdPrice` 29/79/199) → `convertUsd` con tasas de
  `useExchangeRates` (`LandingPage.tsx:45-73,580-593`).
- **Login modal:** `LoginModal` (líneas 729-…): email/password + paso `2fa`, botón demo
  (`handleDemo` usa `DEMO_*`), `useAuth().login` (mismo contrato roto FND-R11).
- **Enlaces:** CTA `navigate('/contratar')` (`:351,608,672`); footer con `href="#"` muertos y
  `<a href="/privacidad|/terminos|/">` (recargan la SPA) (`:336,690-708`).
- **Artefacto paralelo:** `landing-vitaria.html` (1279L, raíz) no referenciado por el router.
- **Hallazgos:** FND-S7, FND-S9, FND-S10.

## U2 — Formulario público de contratación (`/contratar`)
- **Archivo:** `modules/onboarding/pages/OnboardingContractPage.tsx` (546L).
- **Stepper (4 pasos):** `account` → `profile` → `documents` → `review` (`:69`).
- **Paso 1:** `tenant_name`, `domain` (auto-derivado del nombre, `domainFromName`), `country_code`,
  `plan_code`, admin (name/phone/email/password) + confirmación visual.
- **Paso 2:** perfil legal opcional (legal_name, tax_id, region, city, address, postal_code,
  phone, website, license, entity, representante, specialties, doctor_count, operating_hours, notes).
- **Paso 3:** hasta 6 documentos (`DOC_CATEGORIES`: contract/license/tax_id/constitution/logo/other)
  convertidos a base64 con `fileToBase64`.
- **Paso 4:** revisión + `computePreviewCompleteness` (frontend) y recaptcha opcional.
- **Submit:** `onboardingService.onboardTenant(payload)` → 201 → `navigate('/gracias')`.
- **Plans:** `onboardingService.getPlans()` (`GET /saas/plans`).
- **Hallazgos:** FND-S4, FND-S8, FND-S10, FND-S11, FND-S5 (captcha opcional).

## U3 — Agradecimiento (`/gracias`)
- **Archivo:** `modules/onboarding/pages/ThankYouPage.tsx` (48L). Estático (i18n `thanks`).
- **Hallazgos:** ninguno.

## U4 — Panel de onboarding de la clínica (`/settings/onboarding`)
- **Archivo:** `modules/onboarding/pages/ClinicOnboardingPage.tsx` (310L).
- **Ruta/guardas:** `ProtectedRoute(allowedRoles=ADMIN_STAFF)` (`AppRouter.tsx:210-214`).
- **Funciones:** ver estado (`status`/`completeness_pct`/`missing_fields`), editar perfil
  (`PATCH /saas/onboarding`), listar/subir/descargar/borrar documentos.
- **Gap:** si no existe onboarding muestra un formulario de perfil alternativo (`:142-182`).
- **Hallazgos:** FND-S4, FND-S8, FND-S10 (`listDocuments` muerto).

## U5 — Aplicaciones de onboarding (superadmin) (`/onboarding-applications`)
- **Archivo:** `modules/onboarding/pages/SuperAdminOnboardingPage.tsx` (307L).
- **Ruta/guardas:** `ProtectedRoute(allowedRoles=SUPERADMIN_ONLY)` (`AppRouter.tsx:205-209`).
- **Funciones:** pestañas `all|pending|approved|rejected`, búsqueda, paginación (limit 20),
  detalle (documentos + datos), `PATCH .../approve`, `PATCH .../reject` con motivo.
- **Hallazgos:** FND-S6 (paginación), FND-S2 (efecto real de aprobar/rechazar).

## U6 — Legal (`modules/legal`)
- **Archivos:** `LegalLayout.tsx` (69L), `PrivacyPolicyPage.tsx`, `TermsPage.tsx` (30L c/u).
- **Rutas:** `/privacidad` → `PrivacyPolicyPage`; `/terminos` → `TermsPage` (`AppRouter.tsx:412-413`).
- **i18n:** namespace `legal`; fecha de actualización hardcodeada `updated="2026-09-22"`.
- **Hallazgos:** ninguno.

## U7 — Backend: alta de tenant (`onboardTenant`)
- **Archivo:** `src/modules/saas/saas.service.ts:449-580`; controller `:183-203`; schema
  `saas.schema.ts:11-51`.
- **Transacción** (`superAdminPool`, bypass RLS): INSERT `tenants` (active=true) → `users`
  (rol admin) → `subscriptions` (**active**) + `subscription_invoices` (**paid**) →
  `tenant_onboarding` (pending) → documentos → `COMMIT`; recarga cache de tenants.
- **Hallazgos:** FND-S1, FND-S2, FND-S3, FND-S5.

## U8 — Backend: perfil, documentos y aplicaciones
- **Archivo:** `src/modules/saas/onboarding.service.ts` (614L); controller `:207-…`.
- **Perfil:** `getOnboardingForTenant`, `upsertOnboardingProfile`; `computeCompleteness`
  (backend) y `serializeValue` (`:107-113`).
- **Documentos:** `uploadOnboardingDocument` (MIME `ALLOWED_MIME`, `MAX_FILE_BYTES`),
  `listOnboardingDocuments`, `getOnboardingDocument`, `deleteOnboardingDocument`.
- **Aplicaciones:** `listOnboardingApplications`, `getOnboardingApplication`,
  `approveOnboardingApplication` (`:585-598`), `rejectOnboardingApplication` (`:600-614`).
- **Hallazgos:** FND-S1 (origen), FND-S2, FND-S4, FND-S11.
