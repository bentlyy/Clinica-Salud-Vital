# SUB-1 — Archivos (SPA Frontend)

> Rutas relativas a `frontend/`. Columnas `L` = líneas (leídas con la herramienta read).
> Cobertura: los archivos núcleo (bootstrap, router, api-client, providers, i18n,
> permisos, error boundary) fueron leídos y verificados; el resto se catalogó por
> estructura y búsquedas dirigidas (AS-IS).

## Núcleo (leídos)
| Archivo | L | Notas |
|---|---|---|
| `src/main.tsx` | 51 | Providers + Toaster; `QueryClient` defaults. |
| `src/app/router/AppRouter.tsx` | 428 | Lazy + Suspense; `ProtectedRoute`/`FeatureRoute`; 50+ rutas. |
| `src/shared/services/api-client.ts` | 200 | Axios + refresh queue + CSRF + BroadcastChannel. |
| `src/shared/providers/AuthProvider.tsx` | 192 | Sesión, login/logout, restauración. |
| `src/shared/providers/FeatureProvider.tsx` | 51 | `/saas/features`. |
| `src/shared/providers/ThemeProvider.tsx` | 367 | Tema MUI claro/oscuro. |
| `src/shared/constants/permissions.ts` | 83 | Matriz de permisos por rol. |
| `src/shared/utils/role.utils.ts` | 75 | `getRedirectPath`, `normalizeRole`, `hasPermission`, `getRoleColor`. |
| `src/shared/components/ErrorBoundary.tsx` | 105 | Clase + retry (resetKey). |
| `src/shared/services/analytics.ts` | 60 | GA4 opt-in. |
| `src/shared/utils/error-sanitizer.ts` | 50 | Sanea mensajes del backend. |
| `src/shared/config/demo.ts` | 3 | Credenciales demo (FND-R1). |
| `src/shared/types/api.types.ts` | 51 | `JwtUser`, `UserRole`, `PaginatedResponse`. |

## Configuración de build / tipos / tests
| Archivo | L | Notas |
|---|---|---|
| `frontend/package.json` | 59 | Scripts; sin `eslint` (FND-R3). |
| `frontend/vite.config.ts` | 56 | Alias `@`, proxy `/api`, `manualChunks`. |
| `frontend/tsconfig.json` | 6 | Refs a app/node. |
| `frontend/tsconfig.app.json` | 26 | `strict`, `noUncheckedIndexedAccess`; **exclude `src/test`** (FND-R2). |
| `frontend/tsconfig.node.json` | 18 | Solo `vite.config.ts`. |
| `frontend/vitest.config.ts` | 44 | jsdom, umbrales 80/70/70/80 (FND-R10). |

## UI compartida
| Archivo | L |
|---|---|
| `src/shared/components/ui/DataTable.tsx` | 287 |
| `src/shared/components/ui/Combobox.tsx` | 130 |
| `src/shared/components/ui/ConfirmDialog.tsx` | 119 |
| `src/shared/components/ui/Pagination.tsx` | 93 |
| `src/shared/components/ui/ErrorState.tsx` | 70 |
| `src/shared/components/ui/EmptyState.tsx` | 48 |
| `src/shared/components/ui/PageHeader.tsx` | 44 |
| `src/shared/components/ui/PlaceholderPage.tsx` | 39 |
| `src/shared/components/ui/LoadingState.tsx` | 33 |
| `src/shared/components/layout/DashboardLayout.tsx` | 377 |
| `src/shared/components/layout/SidebarItem.tsx` | 222 |
| `src/shared/components/layout/PatientLayout.tsx` | 193 |
| `src/shared/components/lab-icons/LabIcons.tsx` | 183 |
| `src/shared/components/cookies/ConsentBanner.tsx` | 79 |
| `src/shared/components/LanguageSwitcher.tsx` | 68 |
| `src/shared/components/PremiumLocked.tsx` | 59 |
| `src/shared/components/DocumentTitle.tsx` | 47 |
| `src/shared/components/Seo.tsx` | 27 |
| `src/shared/components/WithFeature.tsx` | 21 |
| `src/shared/components/layout/AuthLayout.tsx` | 22 |

## Utilidades y constantes
| Archivo | L |
|---|---|
| `src/shared/utils/pricing.ts` | 84 |
| `src/shared/utils/rut.ts` | 37 |
| `src/shared/utils/pdf.ts` | 35 |
| `src/shared/utils/animations.ts` | 30 |
| `src/shared/utils/localeUtils.ts` | 60 |
| `src/shared/utils/logger.ts` | 11 |
| `src/shared/utils/captcha.ts` | 10 |
| `src/shared/hooks/usePricing.ts` | 131 |
| `src/shared/hooks/useFeature.ts` | 8 |
| `src/shared/hooks/usePageTitle.ts` | 12 |
| `src/shared/constants/navigation.tsx` | 107 |
| `src/shared/services/pricing.service.ts` | 25 |
| `src/i18n/i18n.ts` | 43 |

## Traducciones
| Archivo | L |
|---|---|
| `src/i18n/locales/es.json` | 4012 |
| `src/i18n/locales/en.json` | 4029 |
| `src/i18n/locales/fr.json` | 4012 |
| `src/i18n/locales/pt.json` | 4029 |

## Módulos de dominio (páginas más grandes)
| Archivo | L |
|---|---|
| `src/modules/landing/LandingPage.tsx` | 998 |
| `src/modules/super-admin/pages/SuperAdminAnalyticsPage.tsx` | 851 |
| `src/modules/availability/pages/DoctorCalendarPage.tsx` | 608 |
| `src/modules/laboratory/pages/LabRequestDetailPage.tsx` | 583 |
| `src/modules/bookings/components/CreateBookingDialog.tsx` | 581 |
| `src/modules/availability/pages/AvailabilityPage.tsx` | 579 |
| `src/modules/medical-history/pages/MedicalHistoryPage.tsx` | 572 |
| `src/modules/laboratory/components/qc/QCForm.tsx` | 567 |
| `src/modules/onboarding/pages/OnboardingContractPage.tsx` | 546 |
| `src/modules/laboratory/components/qc/ControlChart.tsx` | 500 |
| `src/modules/bookings/pages/BookingsPage.tsx` | 492 |
| `src/modules/laboratory/components/samples/SampleStorage.tsx` | 490 |

## Inventario agregado
- `src/**` `.ts/.tsx`: **460** (de los cuales **184** en `src/test`).
- Módulos de dominio: **26**; servicios: **26**; hooks: **36**; componentes: **85**; páginas: **61**.
- `frontend` (todos los archivos): ver `catalog/files.csv` (columna `frontend/src/...`).

> Nota de conteo: `catalog/files.csv` fue generado con otro método de conteo (p. ej.
> `AppRouter.tsx`=382 vs 428 aquí). No se persigue el ±; se documenta el de `read`.
