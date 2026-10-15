# SUB-19 — Flujos (Onboarding público, aplicaciones y legal)

## F1 — Alta pública de tenant (`POST /api/saas/onboard`)
```
LandingPage «Contratar» → navigate('/contratar')
  OnboardingContractPage (stepper: account→profile→documents→review)
    loadPlans() → GET /saas/plans  (público)
    docs: fileToBase64(file)  → { file_name, mime_type, data_base64 }
    submit → onboardingService.onboardTenant(payload)
        → POST /api/saas/onboard   (onboardLimiter 3/h/IP; captcha opcional)
            verifyCaptchaOnboard(captcha_token)
              ├─ sin RECAPTCHA_SECRET_KEY → true (abre)
              ├─ TEST key                 → true (abre)
              └─ si no → siteverify (fallo → false)
            validateZod(onboardSchema)
            saas.service.onboardTenant(data):
              BEGIN (superAdminPool)
                SELECT tenants WHERE id=domain OR domain=domain FOR UPDATE
                  → existe → 400 SAAS_DOMAIN_EXISTS (ROLLBACK)
                INSERT tenants (active=true)
                bcrypt.hash(admin_password,12)
                INSERT users (role='admin', password_changed=true)
                if planCode:
                  INSERT subscriptions (status='active')        ← FND-S1
                  INSERT subscription_invoices (status='paid')  ← FND-S1
                insertOnboarding(...)  → tenant_onboarding (status='pending')
                insertOnboardingDocuments(...)  (si hay)
              COMMIT
              tenantService.loadFromDB()
        → 201 { tenantId, subscription, message }
    → navigate('/gracias', { replace:true })
```
Evidencia: `OnboardingContractPage.tsx:100-218`, `onboarding.service.ts:23-31`,
`saas.routes.ts:18-29`, `saas.controller.ts:158-203`, `saas.service.ts:449-580`.

## F2 — Precios y moneda en la landing
```
useSelectedCountry() → localStorage('vitaria_country')  (o DEFAULT_COUNTRY_CODE)
useExchangeRates()   → loadRates() (cache módulo)
     fetchExchangeRates() → GET /currencies/rates  (fallo → FALLBACK_RATES)
PRICING_PLANS (usdPrice 29/79/199) → convertUsd(usdPrice, currency, rates)
     → getCurrencySymbol / formatPricingAmount
```
Evidencia: `usePricing.ts:16-32,73-92`, `pricing.service.ts:17-25`,
`LandingPage.tsx:45-73,322-330,580-593`. Cross-ref FND-O6/H12 (tasas), FND-S7 (hardcoded).

## F3 — Login/demo desde la landing
```
LoginModal.handleSubmit / handleDemo
  → useAuth().login(email, password, totp?, captcha?, tenant_id?)
      → POST /auth/login
  → res.requires_2fa ? { setStep('2fa') } : navigate(getRedirectPath(res.user.role))
  demo → login(DEMO_EMAIL, DEMO_PASSWORD, …, DEMO_TENANT_ID)
```
Evidencia: `LandingPage.tsx:729-825`; `AuthProvider.tsx:120-126`. Cross-ref FND-R1 (demo),
FND-R11 (`requires_2fa` nunca llega → el paso 2fa es inalcanzable).

## F4 — Perfil de onboarding de la clínica (autenticado)
```
/settings/onboarding  (ProtectedRoute ADMIN_STAFF)
  load() → GET /saas/onboarding  → OnboardingProfile | null
     null → muestra formulario de alta de perfil
  onSave → PATCH /saas/onboarding (updateOnboardingProfileSchema)
```
Evidencia: `ClinicOnboardingPage.tsx:45-102`, `saas.routes.ts:44-45`,
`saas.controller.ts:207-222`.

## F5 — Carga de documentos (base64 en JSON)
```
OnboardingContractPage / ClinicOnboardingPage
  File → fileToBase64 → { file_name, mime_type, data_base64 }
  POST /saas/onboarding/documents (o dentro de /onboard)
      onboardingDocumentSchema / onboardSchema.documents (máx 6)
      insertOnboardingDocumentFile:
        ALLOWED_MIME → MAX_FILE_BYTES → fs.writeFile(UPLOAD_ROOT/onboarding/<id>/…)
        INSERT onboarding_documents
  Nota: el body JSON está limitado a express.json({limit:'100kb'})  ← FND-S4 (≈72 KB de archivo)
```
Evidencia: `onboarding.service.ts:95-106,185-212`, `app.ts:182`,
`saas.controller.ts:224-231`, cross-ref FND-K1.

## F6 — Cola de solicitudes del superadmin
```
/onboarding-applications  (ProtectedRoute SUPERADMIN_ONLY)
  load() → GET /saas/onboarding/applications?status&search&page&limit=20
  openDetail(id) → GET /saas/onboarding/applications/:id (+documentos)
  approve → PATCH /saas/onboarding/applications/:id/approve
        approveOnboardingApplication: status='approved'; UPDATE tenants SET active=true
          (el tenant YA estaba active → no-op)              ← FND-S2
  reject  → PATCH /saas/onboarding/applications/:id/reject { reason }
        rejectOnboardingApplication: status='rejected'      (NO desactiva el tenant) ← FND-S2
  paginación: controles solo visibles si page>1             ← FND-S6
```
Evidencia: `SuperAdminOnboardingPage.tsx:56-111,193-198`,
`onboarding.service.ts:585-614`, `saas.routes.ts:52-55`.

## F7 — Páginas legales
```
/privacidad → PrivacyPolicyPage → LegalLayout(title, updated)
/terminos   → TermsPage         → LegalLayout(title, updated)
  LegalLayout: Seo + fecha formateada (Intl) + LegalSection(children)
```
Evidencia: `LegalLayout.tsx:15-69`, `PrivacyPolicyPage.tsx`, `TermsPage.tsx`,
`AppRouter.tsx:411-413`.

## F8 — Arranque y navegación pública
```
main.tsx → … → AppRouter
  públic:  /            → LandingPage
           /contratar    → OnboardingContractPage
           /gracias      → ThankYouPage
           /privacidad   → PrivacyPolicyPage
           /terminos     → TermsPage
           /2fa /login /forgot-password /register /confirm/:token /booking
  privado: /settings/onboarding        (ADMIN_STAFF)
           /onboarding-applications    (SUPERADMIN_ONLY)
```
Evidencia: `AppRouter.tsx:16-124,205-214,404-421`.
