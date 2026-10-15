# SUB-1 — SPA (Frontend React 19)

> Subsistema: aplicación cliente única (SPA) que consume la API REST del backend.
> Paquete: `frontend/` — `vitaria-frontend` v3.0.0. Área: `frontend`.
> Estado: auditado (AS-IS). Hallazgos: `FND-R1`…`FND-R10`.

## 1. Propósito
Interfaz web de Vitaria para los 6 roles de negocio. Es un monolito de UI organizado
por dominio (`modules/*`), con enrutado en cliente, sesión basada en access token en
memoria + refresh cookie, theming MUI claro/oscuro, i18n (es/en/fr/pt) y una capa de
acceso a datos sobre Axios + TanStack Query.

## 2. Stack verificado (`frontend/package.json`)
- React **19**, ReactDOM 19, `react-router-dom` ^7.18.
- Vite **6** + `@vitejs/plugin-react-swc`; TypeScript ~5.7.
- MUI **6** (`@mui/material`, `@mui/icons-material`) + Emotion 11.
- TanStack Query **5** y TanStack Table **8**.
- `axios` ^1.7, `react-hook-form` ^7.54 + `zod` ^3.24 (`@hookform/resolvers`).
- i18next ^26 + `react-i18next` ^17 + `i18next-browser-languagedetector`.
- `recharts` 2, `@fullcalendar/*` 6, `framer-motion` 11, `react-hot-toast` 2.
- `react-google-recaptcha` ^3.
- Testing: Vitest **4** + `@testing-library/react` 16 + `jsdom` 25 + `@vitest/coverage-v8`.
- **No** incluye `@sentry/react` ni `eslint` como dependencia.

## 3. Componentes principales
| Componente | Archivo | Rol |
|---|---|---|
| Bootstrap | `src/main.tsx` (51L) | Monta `QueryClientProvider → BrowserRouter → AppThemeProvider → AuthProvider → FeatureProvider → ErrorBoundary → AppRouter`. `QueryClient` con `retry:1`, `staleTime:30s`, `refetchOnWindowFocus:false`. |
| Router | `src/app/router/AppRouter.tsx` (428L) | Rutas con `lazy()` + `Suspense`; guardas `ProtectedRoute` (rol) y `FeatureRoute` (plan). |
| Auth/sesión | `src/shared/providers/AuthProvider.tsx` (192L) | Restauración vía `/auth/refresh`, login/logout/logoutAll, `hasPermission`. |
| API layer | `src/shared/services/api-client.ts` (200L) | Instancia Axios, interceptor de refresh con cola, CSRF, `BroadcastChannel` cross-tab. |
| Tema | `src/shared/providers/ThemeProvider.tsx` (367L) | MUI theme claro/oscuro, `localStorage('theme_mode')`, `data-theme`. |
| Features (plan) | `src/shared/providers/FeatureProvider.tsx` (51L) | Carga `GET /saas/features`; `hasFeature`. |
| i18n | `src/i18n/i18n.ts` (43L) + `locales/{es,en,fr,pt}.json` | 4 idiomas, **3751 claves idénticas** en los 4 (verificado). |
| UI compartida | `src/shared/components/**` | `ui/` (DataTable, Pagination, EmptyState, ErrorState, LoadingState, ConfirmDialog, Combobox, PageHeader), `layout/` (DashboardLayout 377L, PatientLayout 193L, SidebarItem 222L, AuthLayout), `ErrorBoundary` (105L), `cookies/ConsentBanner`. |
| Utilidades | `src/shared/utils/**` | `role.utils`, `error-sanitizer`, `pricing`, `captcha`, `rut`, `pdf`, `localeUtils`, `animations`, `logger`. |
| Tests | `src/test/**` (184 archivos) | Componentes, hooks, páginas, providers, routes, services. |

## 4. Estructura de carpetas
```
frontend/src/
  main.tsx                 # punto de entrada
  app/{config,router}      # fonts, global.css, AppRouter
  i18n/{i18n.ts,locales}   # i18next + 4 traducciones
  shared/                  # api-client, providers, components, hooks, utils, constants
  modules/                 # 26 módulos de dominio (auth, dashboard, bookings, laboratory,
                           #  clinical-records, prescriptions, medical-history, patients,
                           #  doctors, availability, billing, analytics, reports, audit,
                           #  notifications, specialties, holidays, saas, super-admin,
                           #  settings, users, onboarding, legal, landing, admin, 2fa,
                           #  clinical, clinical-templates, laboratory, waitlist, tenants, management, dashboard)
  test/                    # suite de pruebas (excluida de tsc — ver FND-R2)
```
Métricas: **460** archivos `.ts/.tsx` en `src` (**184** son tests), **26** servicios,
**36** hooks, **85** componentes, **61** páginas, **10** módulos con `hooks/`+`services/`+`types/`.

## 5. Superficie de red (consumo)
- `API_BASE_URL = import.meta.env.VITE_API_URL || '/api'` (`api-client.ts:6`).
- Proxy de desarrollo `'/api' → http://localhost:3000` (`vite.config.ts`).
- El cliente siempre envía `withCredentials: true` (cookies de refresh/CSRF).
- **No** se consumen endpoints `export`/`webhooks`/`events` desde el frontend (ver observaciones).

## 6. Roles en el cliente
`UserRole = superadmin | admin | doctor | lab_technician | patient | guest | user`
(`shared/types/api.types.ts`). Matriz de permisos en `shared/constants/permissions.ts`
(83L). `normalizeRole('user') → 'patient'` (`role.utils.ts:24`); `getRedirectPath`
(`role.utils.ts:5`): superadmin→`/saas`, lab_technician→`/laboratory`, resto→`/dashboard`.

## 7. Reglas / convenciones
- **Token en memoria**: el access token vive en una variable de módulo (`api-client.ts:8`),
  no en `localStorage`; se comparte entre pestañas vía `BroadcastChannel('vitaria-auth')`.
- **Refresh proactivo**: cualquier `401` (excepto `/auth/refresh`) dispara `refreshSession()`
  con cola de suscriptores y un único `refreshPromise` (`api-client.ts:63-83,121-158`).
- **CSRF**: lee cookie `csrf_token` y añade `X-CSRF-Token` en métodos no-GET (`api-client.ts:55-61,98-103`).
- **Lazy loading** de rutas y **Suspense** global (`AppRouter.tsx:16-124,181`).
- **Theming** por tokens MUI (`custom.*`), tipografía Plus Jakarta Sans.

## 8. Hallazgos
| ID | Criticidad | Resumen |
|---|---|---|
| FND-R1 | 🟡 | Credenciales demo hardcodeadas y visibles en la UI/bundle. |
| FND-R2 | 🟡 | `src/test` excluido de `tsconfig.app.json` → los tests no se tipan. |
| FND-R3 | 🟡 | `npm run lint` inválido: sin ESLint (config ni dependencia); CI no lo ejecuta. |
| FND-R4 | 🟡 | Sin reporte de errores en frontend (no Sentry) y un único `ErrorBoundary` raíz. |
| FND-R5 | 🟢 | Componentes sobredimensionados (LandingPage 998L, SuperAdminAnalyticsPage 851L). |
| FND-R6 | 🟢 | `getRoleColor` usa hex hardcodeados en lugar de tokens de tema. |
| FND-R7 | 🟢 | 27 estilos inline `style={{}}` mezclados con `sx`. |
| FND-R8 | 🟢 | `auth_user` en `localStorage` solo se elimina (código muerto). |
| FND-R9 | 🟢 | `error-sanitizer.ts` importa i18n con ruta relativa `.js` (inconsistente con alias `@`). |
| FND-R10 | 🟢 | Umbrales de cobertura frontend (80/70/70/80) por debajo del backend (85/80/85/85); README afirma ~89% sin verificar. |

Detalle y evidencia en `docs/architecture/05-findings.md`.

## 9. Observaciones (no son defectos)
- La autorización por rol en el cliente (`ProtectedRoute`, `permissions.ts`) es **UX/defensa
  en profundidad**; el backend reaplica autorización (ver SUB-6/SUB-7).
- `guest` existe en tipos/permisos (flujo de reserva pública `GuestBookingPage`), pero no
  hay login de rol `guest`.
- El `401` sin refresh exitoso señala logout vía `setUnauthorizedHandler` (`AuthProvider.tsx:109-118`).

## 10. NO VERIFICADO
- Bundle/size real de producción y resultados de `npm run build` en este entorno.
- Cobertura real de tests (no ejecutada aquí) y si `npm test` pasa.
- Si el frontend se despliega como static site de Render y con qué `VITE_*` en prod.
- Si `VITE_GA_MEASUREMENT_ID` / `VITE_RECAPTCHA_SITE_KEY` están configuradas en prod.

## 11. Cross-refs
`docs/architecture/subsystems/auth/*` (SUB-2), `.../multi-tenancy/*` (SUB-3),
`.../seeds/*` (SUB-18, FND-P1/P2), `.../infrastructure/*` (SUB-16, FND-Q),
`.../specialties/*` (SUB-17, FND-O2), `catalog/endpoints.csv`.
