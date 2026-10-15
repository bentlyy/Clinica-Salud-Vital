# 06 — Matriz funcionalidad → pruebas (cobertura de tests)

> **Estado:** ✅ completado · **Método:** inventario estático de archivos de test (backend `tests/**`, frontend `frontend/src/test/**`) + configuración de Vitest. **No se ejecutó** la suite (requiere PostgreSQL y servicios; ver §5).
> **Certeza:** confirmado para existencia/ubicación de tests; **NO VERIFICADO** para cobertura y resultado real.

## 1. Configuración de testing

| | Backend | Frontend |
|---|---|---|
| Config | `vitest.config.js` | `frontend/vitest.config.ts` |
| Environment | `node` | `jsdom` |
| Pool | `forks` | (default) |
| Timeouts | `testTimeout` 30 000 · `hookTimeout` 30 000 | `testTimeout` 20 000 |
| Setup | `./tests/setup.js` | `./src/test/setup.ts` |
| Cobertura | v8; `include src/**/*.ts`; **excluye** `src/app.ts`, `src/seed/**`, `src/jobs/**` | v8; excluye `src/test/**`, `*.d.ts`, `src/main.tsx`, `src/i18n/locales/**` |
| Umbrales | lines **85** · branches **80** · functions **85** · statements **85** | lines **80** · branches **70** · functions **70** · statements **80** |
| Extra | `globals: true`; excluye `frontend/**` | type-check (`tsc`) en CI |

**Observación:** los umbrales del frontend son **más bajos** que los del backend y el frontend **excluye `src/test` del `tsconfig`** (FND-R2). El job `frontend` de CI corre type-check + tests + coverage pero **no lint** (FND-R3).

## 2. Inventario de tests

| Conjunto | Archivos | Ubicación |
|---|---|---|
| Backend unit | **105** | `tests/unit/*.test.{js,ts}` |
| Backend integration | **10** | `tests/integration/*.test.js` |
| Backend helpers | 1 | `tests/helpers/` |
| Frontend | **184** | `frontend/src/test/**/*.test.{ts,tsx}` |
| **Total tests (archivos)** | **299** | — |

- Backend integration: `auth`, `booking`, `clinical-record`, `doctor`, `analytics`, `audit`, `saas`, `super-admin`, `guest-confirmation`, `rls-isolation` (`.routes.test.js`).
- Frontend por carpeta: `components/` (muchos), `hooks/` (25), `pages/` (incl. `laboratory/` y `super-admin/`), `providers/` (3), `routes/` (2), `services/` (22), `utils/` (8), `constants/` (1), `i18n-keys.test.ts`.
- `frontend/src/test/i18n-keys.test.ts` valida paridad de claves i18n (respalda las 3751 claves idénticas de SUB-1).

## 3. Matriz subsistema → cobertura

Leyenda: ✅ cubierto · ⚠️ parcial · ❌ sin tests · `—` no aplica.

| Subsistema | Backend unit | Backend integ | Frontend | Estado |
|---|---|---|---|---|
| SUB-2 Auth/sesiones/2FA | `auth.*`, `jwt.service`, `sessions.service`, `auth-middleware`, `auth-refresh-2fa`, `security.middleware` | `auth.routes` | `LoginPage`, `RegisterPage`, `ForgotPasswordPage`, `TwoFAPage`, `useTwoFA`, `two-fa.service`, `AuthProvider` | ✅ |
| SUB-3 Multi-tenancy/roles | `tenant.middleware`, `feature.middleware`, `multi-tenant.service` | `rls-isolation` | `ProtectedRoute`, `WithFeature`, `FeatureProvider`, `role.utils` | ✅ |
| SUB-7 Clinical | `clinical-record.*`, `clinical-template.*`, `medical-history.*`, `cie10.service` | `clinical-record.routes` | `ClinicalRecordsPage`, `ClinicalRecordDetailPage`, `ClinicalRecordFormDialog`, `VitalsDisplay`, `MedicalHistoryPage`, hooks `useClinical*` | ✅ |
| SUB-6 Booking/agenda | `booking.*`, `availability.*`, `calendar.service`, `guest.*`, `waitlist.*`, `holidays.*`, `booking-history`, `booking-utils` | `booking.routes`, `guest-confirmation.routes` | `BookingsPage`, `BookingCalendar`, `CreateBookingDialog`, `GuestBookingPage`, `ConfirmPage`, `AvailabilityPage`, `useBookings/useAvailability` | ✅ |
| SUB-8 Laboratory | `laboratory.*`, `lab-events.service`, `lab-order-pdf`, `lab-result-email` | — | `laboratory/*` (10 páginas), `LabIcons`, `useLab*`, `lab.service` | ✅ |
| SUB-4 Security | `security.middleware`, `csrf.middleware`, `sanitize`, `escape`, `errors`, `validate.middleware` | — | — (impl. backend) | ⚠️ |
| SUB-15 Database/data-access | `db.test`, `query.test`, `shared.test` | `rls-isolation` | — | ✅ |
| SUB-11 Billing/SaaS/pagos | `billing.*`, `saas.*`, `mercadopago.service`, `prescription*` | `saas.routes` | `BillingPage`, `super-admin/SuperAdminBillingPage`, `billing.service`, `useBilling` | ✅ |
| SUB-5 Users/doctors/pacientes | `doctor.*`, `super-admin.*`, `admin.seed` | `doctor.routes`, `super-admin.routes` | `DoctorsPage`, `UsersPage`, `PatientsPage`, `DoctorFormDialog`, `useDoctors/useUsers/usePatients` | ✅ |
| SUB-10 Notifications | `notification.*`, `email.service`, `alerts.service`, `reminder.job` | — | `NotificationsPage`, `NotificationBell`, `notification.service`, `useNotifications` | ✅ |
| SUB-9 Attachments/PDF | `attachments.service`, `prescription-pdf.service`, `report-pdf.service`, `lab-order-pdf.service` | — | `utils/pdf` | ⚠️ (sin `attachments.controller`) |
| SUB-12 Analytics/reports/métricas | `analytics.*`, `reports.*`, `metrics.service` | `analytics.routes` | `analytics/*` (7 comp.), `ReportsPage`, `DashboardPage`, `useAnalytics`, `useReports`, `reportGenerator` | ✅ |
| SUB-13 Audit | `audit.*`, `audit-integrity.job` | `audit.routes` | `AuditPage`, `AuditDetailDialog`, `audit.service`, `useAudit` | ✅ |
| SUB-14 Data-portability/webhooks | `data-portability.*`, `webhooks.*`, `queue.service`, `cleanup.service` | — | — (sin consumidor web) | ⚠️ |
| SUB-17 Specialties/currencies | `specialties.*`, `cie10.service`; **`currencies` ❌** | — | `SpecialtiesPage` + 8 comp., `useSpecialties`, `specialty.service` | ⚠️ |
| SUB-18 Seeds | `admin.seed` | — | `AdminDemoDataPage`, `SuperAdminDemoDataPage` | ⚠️ |
| SUB-16 Infra/observabilidad | `health`, `app`, `sentry.service`, `metrics.service` | — | — | ✅ |
| SUB-1 SPA frontend | `correlationId`, `requestLogger` (shared) | — | `AppRouter`, `ProtectedRoute`, providers, `api-client`, `error-sanitizer`, `localeUtils`, `logger`, `role.utils` | ✅ |
| SUB-19 Onboarding/landing/legal | `saas.*`, `saas.schema` | `saas.routes` | `LandingPage`, `ThankYouPage`, `PrivacyPolicyPage`, `TermsPage`; **`OnboardingContractPage` ❌**, **`ClinicOnboardingPage` ❌**, **`SuperAdminOnboardingPage` ❌** | ⚠️ |

## 4. Gaps de cobertura identificados

| # | Gap | Evidencia | Riesgo |
|---|---|---|---|
| G1 | Sin tests de los **paneles de onboarding** (`OnboardingContractPage`, `ClinicOnboardingPage`, `SuperAdminOnboardingPage`) | ausencia en `frontend/src/test/pages/` | el flujo FND-S1/S2 (alta y rechazo) no está cubierto |
| G2 | **Módulo `currencies` backend** sin tests unit | ausencia en `tests/unit/` | conversión de moneda no cubierta |
| G3 | `attachments.controller` sin test (solo service) | `tests/unit` | subida/descarga no cubierta a nivel controller |
| G4 | `usePricing` / `pricing.service` (landing) sin tests | ausencia en `frontend/src/test/{hooks,services}` | lógica de moneda/precio de landing no cubierta |
| G5 | SUB-4 Security sin tests de integración (solo unit) | `tests/integration/` | cadena CSRF/headers no probada end-to-end |
| G6 | Frontend sin test de `saas` (cliente) ni de `waitlist`; cobertura de UI desigual | ausencia en `frontend/src/test/services` | — |
| G7 | Sin tests e2e (Playwright/Cypress) | no hay dependencia ni config | flujos completos no verificados |

## 5. Limitaciones y NO VERIFICADO

- **No se ejecutó** `npm test` / `npx vitest run` (backend y frontend requieren PostgreSQL y servicios externos). No hay por tanto evidencia de tests pasando (exit 0) ni de cobertura real.
- El **README del proyecto** afirma ~**2730 tests** y ~**89 %** de cobertura — **NO VERIFICADO**; el inventario estático aquí registra **299 archivos** de test (el número de *casos* puede ser mayor por bloques `it/test` múltiples).
- No se comprobó si los umbrales de cobertura se cumplen en CI.
- `tests/unit/routes.test.ts` es el único test unitario en TypeScript (el resto en JS).

## 6. Comandos de referencia

```bash
# Backend
npx vitest run --reporter=verbose
npx vitest run --coverage

# Frontend
cd frontend
npm run test          # vitest run
npm run test:coverage
```

---

> Tags: #testing #vitest #cobertura · Ver: [`04-cross-cutting-concerns.md`](04-cross-cutting-concerns.md) · [`05-findings.md`](05-findings.md)
