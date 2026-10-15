# SUB-19 — Onboarding público, aplicaciones y legal (frontend + backend)

> Subsistema: formulario público de contratación de clínicas, panel de onboarding
> autenticado, revisión de solicitudes por superadmin, páginas legales y landing de
> marketing. Área: `frontend/src/modules/{onboarding,legal,landing}` + `src/modules/saas`
> (subconjunto onboarding). Estado: auditado (AS-IS). Hallazgos: `FND-S1`…`FND-S11`.

## 1. Propósito
Es el embudo de adquisición y alta de tenants: (1) la **landing** narrativa con precios y
login/demo embebido; (2) el formulario público **`/contratar`** (4 pasos: cuenta, perfil,
documentos, revisión) que crea el tenant llamando a `POST /api/saas/onboard`; (3) la página
de agradecimiento **`/gracias`**; (4) el panel autenticado de la clínica
**`/settings/onboarding`** (perfil + documentos); (5) la cola de solicitudes del superadmin
**`/onboarding-applications`** (aprobar/rechazar); y (6) las páginas legales
**`/privacidad`** y **`/terminos`**.

## 2. Superficie HTTP (backend)
| Método | Ruta | Auth | Validación | Controlador |
|---|---|---|---|---|
| GET | `/api/saas/plans` | **público** | — | `saasController.getPlans` |
| POST | `/api/saas/onboard` | **público** (`onboardLimiter` 3/h/IP; captcha en controller) | `validateZod(onboardSchema)` | `saasController.onboardTenant` |
| GET | `/api/saas/onboarding` | `admin`,`superadmin` | — | `getMyOnboarding` |
| PATCH | `/api/saas/onboarding` | `admin`,`superadmin` | `updateOnboardingProfileSchema` | `updateMyOnboarding` |
| POST | `/api/saas/onboarding/documents` | `admin`,`superadmin` | `onboardingDocumentSchema` | `uploadOnboardingDocument` |
| GET | `/api/saas/onboarding/documents` | `admin`,`superadmin` | — | `listMyOnboardingDocuments` |
| GET | `/api/saas/onboarding/documents/:id/download` | `admin`,`superadmin` | `onboardingDocumentIdSchema` | `downloadOnboardingDocument` |
| DELETE | `/api/saas/onboarding/documents/:id` | `admin`,`superadmin` | `onboardingDocumentIdSchema` | `deleteOnboardingDocument` |
| GET | `/api/saas/onboarding/applications` | `superadmin` | `listOnboardingApplicationsQuerySchema` | `listOnboardingApplications` |
| GET | `/api/saas/onboarding/applications/:id` | `superadmin` | `onboardingIdSchema` | `getOnboardingApplication` |
| PATCH | `/api/saas/onboarding/applications/:id/approve` | `superadmin` | `onboardingIdSchema` | `approveOnboardingApplication` |
| PATCH | `/api/saas/onboarding/applications/:id/reject` | `superadmin` | `onboardingIdSchema` + `rejectOnboardingSchema` | `rejectOnboardingApplication` |

Evidencia: `src/modules/saas/saas.routes.ts:25-55`. `/api/saas/onboard` está además en la
lista `PUBLIC_PATH` del middleware de tenant (`src/middlewares/tenant.middleware.ts:29`).

## 3. Componentes
| Componente | Archivo | Líneas | Rol |
|---|---|---|---|
| Formulario público | `frontend/src/modules/onboarding/pages/OnboardingContractPage.tsx` | 546 | Stepper 4 pasos; recaptcha opcional; sube documentos en base64. |
| Agradecimiento | `frontend/src/modules/onboarding/pages/ThankYouPage.tsx` | 48 | Confirmación estática post-alta. |
| Panel clínica | `frontend/src/modules/onboarding/pages/ClinicOnboardingPage.tsx` | 310 | Edita perfil y gestiona documentos del tenant. |
| Panel superadmin | `frontend/src/modules/onboarding/pages/SuperAdminOnboardingPage.tsx` | 307 | Lista/filtra/pagina y aprueba/rechaza solicitudes. |
| Servicio | `frontend/src/modules/onboarding/services/onboarding.service.ts` | 106 | 12 llamadas a la API + `fileToBase64`. |
| Tipos | `frontend/src/modules/onboarding/types/onboarding.types.ts` | 163 | `OnboardPayload`, `OnboardingProfile`, `OnboardingApplication*`. |
| Landing | `frontend/src/modules/landing/LandingPage.tsx` | 998 | Marketing + login/demo embebido; precios hardcodeados. |
| Estilos landing | `frontend/src/modules/landing/LandingPage.css` | 2059 | CSS propio de la landing (clases `lp-*`, `lm-*`). |
| Artefacto HTML | `landing-vitaria.html` (raíz del repo) | 1279 | Versión estática paralela de la landing (no referenciada por el router). |
| Legal | `frontend/src/modules/legal/{components/LegalLayout.tsx,pages/{PrivacyPolicyPage,TermsPage}.tsx}` | 69/30/30 | Layout y páginas de privacidad/términos (i18n namespace `legal`). |
| Backend alta | `src/modules/saas/saas.service.ts` → `onboardTenant` | 449-580 | Crea tenant + admin + suscripción + onboarding (transacción, `superAdminPool`). |
| Backend onboarding | `src/modules/saas/onboarding.service.ts` | 614 | `tenant_onboarding`, documentos, aplicaciones. |
| Backend controller | `src/modules/saas/saas.controller.ts` | 313 | `onboardTenant` (+ `verifyCaptchaOnboard`), onboarding y aplicaciones. |
| Schemas | `src/modules/saas/saas.schema.ts` (`onboardSchema`), `onboarding.schema.ts` | 51/56 | Validación Zod. |

## 4. Roles
- **Público (sin sesión):** landing, `/contratar`, `/gracias`, `/privacidad`, `/terminos`,
  `GET /plans`, `POST /onboard`.
- **`admin` / `superadmin`:** perfil y documentos de onboarding del propio tenant.
- **`superadmin`:** cola de aplicaciones (aprobar/rechazar).
- El formulario público crea un usuario con rol **`admin`** en el tenant nuevo
  (`saas.service.ts:502-506`).

## 5. Reglas / convenciones observadas
- El `domain` elegido en el formulario se usa **como `id` del tenant** (`tenantId = domain`,
  `saas.service.ts:464`) y se valida con `/^[a-z0-9-]+$/` (frontend y `onboardSchema`).
- La unicidad se comprueba con `SELECT ... WHERE id = $1 OR domain = $2 FOR UPDATE`
  (`saas.service.ts:478`).
- El alta de tenant crea en la misma transacción: `tenants` (con `active=true`), `users`
  (rol admin, `password_changed=true`), `subscriptions` (**`status='active'`**),
  `subscription_invoices` (**`status='paid'`**) y `tenant_onboarding` (`status='pending'`).
- La moneda se resuelve por `country_code`/`currency` con `SUPPORTED_COUNTRIES`
  (`saas.service.ts:466-472`).
- Los documentos se envían por JSON en base64 (`data_base64`) con `category`/`file_name`/
  `mime_type`; validación de MIME (`ALLOWED_MIME`) y tamaño (`MAX_FILE_BYTES`) en el servicio.
- La landing no consume la API de negocio salvo `GET /currencies/rates` (indirectamente vía
  `usePricing`).

## 6. Hallazgos
| ID | Criticidad | Resumen |
|---|---|---|
| FND-S1 | 🔴 | El alta pública autoprovisiona el plan elegido como `active` y emite factura `paid` sin cobro. |
| FND-S2 | 🔴 | Aprobar es un no-op y **rechazar no desactiva el tenant**: la solicitud rechazada conserva acceso. |
| FND-S3 | 🟡 | Alta sin verificación ni notificación por email; el admin queda activo de inmediato. |
| FND-S4 | 🟡 | Documentos de onboarding por base64 en JSON limitados a `express.json` 100 KB (falla > ~72 KB). |
| FND-S5 | 🟡 | `verifyCaptchaOnboard` falla-abierto si `RECAPTCHA_SECRET_KEY` no está definida o es la TEST key. |
| FND-S6 | 🟢 | Paginación del panel superadmin inalcanzable: controles solo si `page > 1`. |
| FND-S7 | 🟢 | Precios de la landing hardcodeados (USD 29/79/199), desacoplados del catálogo backend. |
| FND-S8 | 🟢 | `operating_hours` con shape inconsistente entre formulario público, panel clínica y schema. |
| FND-S9 | 🟢 | Enlaces muertos `href="#"` y anclas `href="/..."` que recargan la SPA en la landing/footer. |
| FND-S10 | 🟢 | Código/artefactos vestigiales (`listDocuments` muerto, `landing-vitaria.html`, `void RECAPTCHA_*`). |
| FND-S11 | 🟢 | Dos algoritmos de completitud distintos (frontend `computePreviewCompleteness` vs backend). |

Detalle y evidencia en `docs/architecture/05-findings.md`.

## 7. Observaciones (no defectos)
- La autorización del panel de documentos (`authorize('admin','superadmin')`) se reaplica en
  el backend; el scope por tenant lo impone `req.tenant_id`.
- El captcha del formulario público es opcional por diseño en no-producción
  (`RECAPTCHA_SITE_KEY`/`RECAPTCHA_SECRET_KEY`); en producción `security.middleware` exige el
  secret al arrancar (ver FND-F1).
- La landing incluye su propio login modal con paso 2FA; por tanto también queda afectada por
  FND-R11 (el backend nunca devuelve `requires_2fa`).

## 8. NO VERIFICADO
- Si la landing (`landing-vitaria.html` o el componente React) está efectivamente desplegada
  y cuál de las dos versiones.
- Si `RECAPTCHA_SECRET_KEY` está definida en producción (cross-ref FND-Q2/Q3).
- Si `MAX_FILE_BYTES`/`UPLOAD_ROOT` persisten en el entorno de despliegue (cross-ref FND-K3).
- Frescura real de las tasas de cambio (`GET /currencies/rates`, cross-ref FND-O6/H12).
- Si un operador usa realmente el flujo aprobar/rechazar.

## 9. Cross-refs
`subsystems/billing/*` (SUB-11, FND-H1/H2/H9), `.../seeds/*` (SUB-18, FND-P1/P2),
`.../security/*` (SUB-4, FND-F1), `.../attachments/*` (SUB-9, FND-K1),
`.../specialties/*` (SUB-17, FND-O6), `.../frontend/*` (SUB-1, FND-R11),
`catalog/endpoints.csv`, `catalog/modules.csv`.
