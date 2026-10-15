# SUB-19 — Archivos (Onboarding público, aplicaciones y legal)

> Recuentos tomados con la herramienta de lectura (1-indexada). Backend en `src/`,
> frontend en `frontend/src/`, artefacto HTML en la raíz.

## Backend
| Archivo | Líneas | Rol |
|---|---|---|
| `src/modules/saas/saas.routes.ts` | 57 | Monta las 12 rutas de onboarding y el limiter público. |
| `src/modules/saas/saas.controller.ts` | 313 | `onboardTenant` (+`verifyCaptchaOnboard`), perfil/documentos, aplicaciones. |
| `src/modules/saas/saas.service.ts` | 675 | `onboardTenant` (449-580) + planes/suscripción. |
| `src/modules/saas/saas.schema.ts` | 51 | `onboardSchema`, `checkoutSchema`, `changePlanSchema`. |
| `src/modules/saas/onboarding.service.ts` | 614 | `tenant_onboarding`, documentos, aplicaciones, completitud. |
| `src/modules/saas/onboarding.schema.ts` | 56 | Schemas de perfil/documentos/aplicaciones. |
| `src/middlewares/tenant.middleware.ts` | 91 | `/api/saas/onboard` en `PUBLIC_PATH` (`:29`). |

## Frontend — módulo onboarding
| Archivo | Líneas | Rol |
|---|---|---|
| `frontend/src/modules/onboarding/pages/OnboardingContractPage.tsx` | 546 | Formulario público `/contratar`. |
| `frontend/src/modules/onboarding/pages/ThankYouPage.tsx` | 48 | Página `/gracias`. |
| `frontend/src/modules/onboarding/pages/ClinicOnboardingPage.tsx` | 310 | Panel `/settings/onboarding`. |
| `frontend/src/modules/onboarding/pages/SuperAdminOnboardingPage.tsx` | 307 | Panel `/onboarding-applications`. |
| `frontend/src/modules/onboarding/services/onboarding.service.ts` | 106 | 12 llamadas API + `fileToBase64`. |
| `frontend/src/modules/onboarding/types/onboarding.types.ts` | 163 | Tipos del módulo. |

## Frontend — landing y legal
| Archivo | Líneas | Rol |
|---|---|---|
| `frontend/src/modules/landing/LandingPage.tsx` | 998 | Landing + login/demo embebido. |
| `frontend/src/modules/landing/LandingPage.css` | 2059 | Estilos `lp-*`/`lm-*`. |
| `frontend/src/modules/legal/components/LegalLayout.tsx` | 69 | Layout legal + `LegalSection`. |
| `frontend/src/modules/legal/pages/PrivacyPolicyPage.tsx` | 30 | `/privacidad`. |
| `frontend/src/modules/legal/pages/TermsPage.tsx` | 30 | `/terminos`. |

## Frontend — soporte (compartido, referenciado por SUB-19)
| Archivo | Líneas | Rol |
|---|---|---|
| `frontend/src/shared/hooks/usePricing.ts` | 131 | Países/monedas y tasas para la landing. |
| `frontend/src/shared/services/pricing.service.ts` | 25 | `GET /currencies/rates` con fallback. |
| `frontend/src/shared/utils/pricing.ts` | 84 | `SUPPORTED_COUNTRIES`, `FALLBACK_RATES`, `convertUsd`. |
| `frontend/src/app/router/AppRouter.tsx` | 428 | Rutas `/`, `/contratar`, `/gracias`, legales y paneles (`:205-214,404-413`). |

## Artefacto
| Archivo | Líneas | Nota |
|---|---|---|
| `landing-vitaria.html` | 1279 | Landing estática paralela en la raíz; no referenciada por el router (FND-S10). |
