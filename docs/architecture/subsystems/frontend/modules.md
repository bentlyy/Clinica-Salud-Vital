# SUB-1 — Módulos (SPA Frontend)

> Unidad `SUB1-Ux`: bloques funcionales del frontend. Unidades frontend de dominio
> `MOD-f-*` (ver `catalog/modules.csv`). Todas las rutas cuelgan de
> `protectedLayout` salvo las públicas.

## U1 — Bootstrap y providers
- **Archivo:** `src/main.tsx` (51L).
- **Composición:** `QueryClientProvider` → `BrowserRouter` → `AppThemeProvider` →
  `AuthProvider` → `FeatureProvider` → `ErrorBoundary` → `AppRouter`; `Toaster` (react-hot-toast).
- **`QueryClient`:** `retry:1`, `refetchOnWindowFocus:false`, `staleTime:30_000`.
- **Evidencia:** `main.tsx:14-50`.

## U2 — Router, guardas de rol y de plan
- **Archivo:** `src/app/router/AppRouter.tsx` (428L).
- **Patrón:** todas las páginas con `lazy(() => import(...))` y `Suspense` (`:16-124,181`).
- **Guardas:**
  - `ProtectedRoute({allowedRoles})` (`:137-152`): `isLoading→LoadingState`; sin sesión→`/`;
    rol no permitido→`getRedirectPath(rol)`.
  - `FeatureRoute({featureKey})` (`:154-161`): usa `useFeature`; sin plan→`PremiumLocked`.
  - `UsersRoute` (`:163-167`): superadmin→`SuperAdminUsersPage`, resto→`UsersPage`.
- **Conjuntos de roles:** `SUPERADMIN_ONLY`, `ADMIN_STAFF`, `STAFF_ROLES`, `CLINICAL_ROLES`,
  `BOOKING_ROLES` (`:131-135`).
- **Ruta contenedora:** `/dashboard`…`/saas/success` bajo `DashboardLayout` con
  `allowedRoles=['superadmin','admin','doctor','lab_technician','patient','user']` (`:186-192`).
- **Rutas públicas:** `/` (Landing), `/contratar`, `/gracias`, `/privacidad`, `/terminos`,
  `/2fa`, `/login`, `/forgot-password`, `/register`, `/confirm/:token`, `/booking` (`:404-421`);
  catch-all `*`→`NotFoundPage` (`:424`).
- **Efectos:** `trackPageView` en cambio de ruta (`:172-174`), `initAnalytics` (`:176-178`).
- **Hallazgos:** FND-R4 (un solo ErrorBoundary raíz).

## U3 — Autenticación, sesión y capa API
- **`AuthProvider.tsx`** (192L): `user`, `isAuthenticated`, `isLoading`, `login`, `logout`,
  `logoutAll`, `hasPermission`. Restaura sesión con `refreshSession()`; distingue error
  de auth (limpia estado) vs red/5xx (no confía en localStorage). `logout` persiste intención
  (`auth_logout_pending`) y reintenta 3× con backoff (`:128-162`).
- **`api-client.ts`** (200L): access token en memoria; `refreshSession()` con
  `refreshPromise` único y cola `refreshSubscribers`; interceptor de request (Bearer + CSRF);
  interceptor de response (refresh-on-401, toasts por estado 400/401/403/404/409/429/500);
  `BroadcastChannel` para rotación multi-pestaña; `getCsrfToken()` desde cookie `csrf_token`.
- **Hallazgos:** FND-R8 (`auth_user` muerto), FND-R9.

## U4 — Tema e i18n
- **`ThemeProvider.tsx`** (367L): `buildTheme(mode)` memoizado; paleta `custom.*` con
  variantes dark; `data-theme` en `<html>`; `localStorage('theme_mode')`; detecta
  `prefers-color-scheme`. `useThemeMode()`.
- **`i18n.ts`** (43L) + `locales/{es,en,fr,pt}.json`: **3751 claves** en cada idioma
  (paridad total verificada). Namespaces incluyen `common`, `errors`, `demo_data`,
  `error_boundary`, `error_sanitizer`, etc.
- **Hallazgos:** FND-R6 (colores hex fuera de tokens).

## U5 — UI compartida y layouts
- **`components/ui/`:** `DataTable` (287L, TanStack Table), `Pagination` (93L),
  `EmptyState`/`ErrorState`/`LoadingState`, `ConfirmDialog` (119L), `Combobox` (130L),
  `PageHeader`, `PlaceholderPage`.
- **`components/layout/`:** `DashboardLayout` (377L), `PatientLayout` (193L),
  `SidebarItem` (222L), `AuthLayout`.
- **Otros:** `ErrorBoundary` (105L, clase + retry con resetKey), `PremiumLocked`,
  `WithFeature`, `LanguageSwitcher`, `DocumentTitle`, `Seo`, `cookies/ConsentBanner`,
  `lab-icons/LabIcons` (183L).
- **Constantes:** `navigation.tsx` (107L, ítems de sidebar), `permissions.ts` (83L).
- **Hallazgos:** FND-R4, FND-R7 (27 inline styles), FND-R5 (componentes grandes).

## U6 — Módulos de dominio (`src/modules/*`)
Cada módulo sigue, con variaciones, la estructura `pages/ · components/ · hooks/ · services/ · types/`.
Servicios de API (26): p. ej. `specialties/services/specialty.service.ts`,
`laboratory/services/lab.service.ts`, `notifications/services/notification.service.ts`.
Hooks (36) de TanStack Query; en total **235** usos de `useQuery`/`useMutation`/`useQueryClient`.

| `MOD-f-*` | Módulo | Rol principal |
|---|---|---|
| `MOD-f-audit` | `modules/audit` (5 servicios/páginas) | admin/superadmin |
| `MOD-f-specialties` | `modules/specialties` (12) | admin/superadmin |
| — | `modules/auth` | público |
| — | `modules/dashboard` | todos |
| — | `modules/bookings` (+ `GuestBookingPage`, `ConfirmPage`) | staff/paciente/público |
| — | `modules/laboratory` (subcomponentes dashboard/inventory/qc/results/samples) | staff |
| — | `modules/clinical-records`, `clinical-templates`, `clinical` | staff |
| — | `modules/prescriptions`, `medical-history`, `patients`, `doctors` | staff/paciente |
| — | `modules/availability` (+ `DoctorCalendarPage`) | staff |
| — | `modules/billing`, `saas`, `super-admin`, `tenants` | admin/superadmin |
| — | `modules/analytics`, `reports` | staff |
| — | `modules/notifications` | staff/paciente |
| — | `modules/settings`, `users`, `management`, `holidays` | staff |
| — | `modules/onboarding`, `legal`, `landing` | público (SUB-19) |
| — | `modules/admin`, `super-admin` (demo data) | admin/superadmin |

- **Demo data:** `AdminDemoDataPage`, `SuperAdminDemoDataPage` (solo lectura de datos sembrados).
- **Hallazgos:** FND-R5 (LandingPage 998L, SuperAdminAnalyticsPage 851L, DoctorCalendarPage 608L).

## U7 — Analítica y consentimiento
- **`shared/services/analytics.ts`** (60L): GA4 (`VITE_GA_MEASUREMENT_ID`), `initAnalytics`
  inyecta `gtag`, `trackPageView`/`trackEvent` **solo si hay consentimiento** de analítica
  (`consentEnabled()` lee `getCookieConsent()`).
- **`shared/components/cookies/ConsentBanner.tsx`** (79L): persiste `vitaria_cookie_consent`.
- **Hallazgo:** ninguno (opt-in correcto).

## U8 — Infraestructura de testing
- **`vitest.config.ts`**: `environment:'jsdom'`, `globals:true`, `setupFiles:'./src/test/setup.ts'`,
  `css:true`, `testTimeout:20000`. Cobertura v8 → `text/lcov/html`; `include:['src/**/*.{ts,tsx}']`;
  `exclude:['src/test/**','src/**/*.d.ts','src/main.tsx','src/i18n/locales/**']`;
  umbrales `lines:80, branches:70, functions:70, statements:80`.
- **Scripts:** `test`=`vitest run`, `test:unit`=`vitest run --dir src/test`,
  `type-check`=`tsc --noEmit`, `build`=`tsc -b && vite build`, `lint`=`eslint .`.
- **Suite:** `src/test/**` (184 archivos).
- **Hallazgos:** FND-R2, FND-R3, FND-R10.
