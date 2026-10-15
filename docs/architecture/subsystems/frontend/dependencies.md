# SUB-1 — Dependencias (SPA Frontend)

## 1. Dependencias de runtime (npm)
| Paquete | Versión | Uso |
|---|---|---|
| `react`, `react-dom` | ^19 | UI. |
| `react-router-dom` | ^7.18 | Enrutado SPA. |
| `@tanstack/react-query` | ^5.62 | Estado servidor / caché. |
| `@tanstack/react-table` | ^8.21 | `DataTable`. |
| `@mui/material`, `@mui/icons-material` | ^6.4 | Componentes y tema. |
| `@emotion/react`, `@emotion/styled` | ^11.14 | Motor de estilos MUI. |
| `axios` | ^1.7 | HTTP (api-client). |
| `react-hook-form`, `@hookform/resolvers`, `zod` | ^7.54 / ^3.9 / ^3.24 | Formularios + validación cliente. |
| `i18next`, `react-i18next`, `i18next-browser-languagedetector` | ^26 / ^17 / ^8 | i18n. |
| `date-fns` | ^4.1 | Fechas. |
| `recharts` | ^2.15 | Gráficas (analytics/laboratory). |
| `@fullcalendar/*` | ^6.1 | Calendario de doctor. |
| `framer-motion` | ^11.15 | Animaciones. |
| `react-hot-toast` | ^2.5 | Notificaciones UI. |
| `react-google-recaptcha` | ^3.1 | Captcha en login/registro. |

## 2. Dependencias de desarrollo
| Paquete | Versión | Uso |
|---|---|---|
| `vite` | ^6 | Bundler. |
| `@vitejs/plugin-react-swc` | ^4 | Fast refresh SWC. |
| `typescript` | ~5.7 | Tipos. |
| `vitest`, `@vitest/coverage-v8` | ^4.1 | Tests + cobertura. |
| `@testing-library/react` | ^16.1 | Render de componentes. |
| `@testing-library/user-event`, `@testing-library/jest-dom` | ^14 / ^6.6 | Interacción/asserts. |
| `jsdom` | ^25 | Entorno DOM. |
| `@types/*` | — | Tipos React/Node/reCAPTCHA. |

**Ausentes relevantes:** `eslint` (FND-R3), `@sentry/react` (FND-R4).

## 3. Dependencias de API (backend consumido)
- Base: `VITE_API_URL` o `/api` (`api-client.ts:6`).
- Autenticación: `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`,
  `POST /auth/logout-all` (`AuthProvider.tsx:69,121,134,151`; `api-client.ts:68`).
- Features de plan: `GET /saas/features` (`FeatureProvider.tsx:22`).
- Todas las llamadas autenticadas llevan `Authorization: Bearer` (memoria) y, en
  métodos de escritura, `X-CSRF-Token` desde cookie (`api-client.ts:92-106`).
- **No** se invocan desde el frontend: `GET /metrics`, `/api/export`, `/api/webhooks`,
  `/api/events` (SSE) — ver `catalog/endpoints.csv` y observaciones de SUB-14.

## 4. Dependencias de configuración (variables de entorno del cliente)
| Variable | Uso | Evidencia |
|---|---|---|
| `VITE_API_URL` | base URL de la API | `api-client.ts:6` |
| `VITE_GA_MEASUREMENT_ID` | Google Analytics 4 | `analytics.ts:11` |
| `VITE_RECAPTCHA_SITE_KEY` | site key de reCAPTCHA | búsqueda `import.meta.env` |
| `import.meta.env.DEV` | ramas de desarrollo | búsqueda `import.meta.env` |

## 5. Dependencias internas (grafo)
- `main.tsx` → providers (`Theme`, `Auth`, `Feature`), `ErrorBoundary`, `AppRouter`.
- `AppRouter` → `AuthProvider` (`useAuth`), `useFeature`, `role.utils`, `DashboardLayout`,
  páginas `modules/*` (lazy), `analytics`, `ConsentBanner`, `DocumentTitle`.
- `AuthProvider` → `api-client`, `role.utils`, `api.types`.
- `FeatureProvider` → `AuthProvider`, `api-client`.
- `modules/*/services/*` → `api-client` (+ `api.types`).
- `modules/*/hooks/*` → TanStack Query + `services`.
- `analytics` → `ConsentBanner` (`getCookieConsent`).
- `error-sanitizer` → `i18n`.

## 6. Acoplamientos y riesgos
- **Cookie CSRF:** el cliente confía en que el backend exponga una cookie legible
  `csrf_token` (no httpOnly) — coherente con SUB-2/SUB-3.
- **`BroadcastChannel`:** requiere navegadores modernos; degrada silenciosamente
  (`api-client.ts:23-35`).
- **Feature gating** depende de `GET /saas/features`; si falla, `features = {}` →
  todo lo premium bloqueado (`FeatureProvider.tsx:24-25`).
- **Sin tipado de tests** (FND-R2) puede ocultar errores de la propia suite.
