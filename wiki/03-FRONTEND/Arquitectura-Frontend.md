# Arquitectura Frontend

> Estructura y organización del frontend React (2026-11-02 actualizado contra el código real).

## Estructura de Directorios

```
frontend/src/
├── main.tsx                # Entry: QueryClient > BrowserRouter > Theme > Auth > Feature > ErrorBoundary > AppRouter
├── app/
│   ├── config/             # fonts.ts, global.css
│   └── router/AppRouter.tsx  # rutas lazy, ProtectedRoute, FeatureRoute
├── modules/                # 32 módulos por feature
│   ├── auth/               # Register, invitación (login delegado al Core)
│   ├── laboratory/         # el módulo más extenso (páginas, componentes, LabSSEProvider)
│   ├── super-admin/        # panel multi-tenant
│   ├── bookings/, doctors/, patients/, clinical-records/, prescriptions/,
│   ├── medical-history/, billing/, analytics/, reports/, audit/,
│   ├── settings/, notifications/, specialties/, holidays/, availability/,
│   ├── waitlist/, clinical-templates/, 2fa/, dashboard/, landing/,
│   ├── admin/, tenants/, users/, management/, onboarding/, legal/, clinical/, attachments/
├── shared/                 # components, config, constants, hooks, providers, services, types, utils
│   ├── components/         # layouts (Auth/Dashboard/Patient/SidebarItem) + ui/ + ErrorBoundary + WithFeature…
│   ├── constants/          # navigation.tsx (items por rol), permissions.ts
│   ├── hooks/              # useFeature, usePageTitle, usePricing
│   ├── providers/          # AuthProvider, FeatureProvider, ThemeProvider
│   ├── services/           # api-client.ts (cliente Axios central), analytics.ts, pricing.service.ts
│   ├── types/              # api.types.ts
│   └── utils/              # role.utils, rut, error-sanitizer, localeUtils, pdf, logger, animations, captcha, pricing
├── i18n/                   # i18n.ts + locales/{es,en,pt,fr}.json (72 namespaces c/u)
└── test/                   # 184 archivos de test (setup.ts + i18n-keys.test.ts)
```

## Provider Stack

```
QueryClientProvider (TanStack Query)
  └ BrowserRouter
    └ AppThemeProvider (MUI claro/oscuro)
      └ AuthProvider (sesión SSO desde /auth/inicio)
        └ FeatureProvider (feature flags SaaS)
          └ ErrorBoundary
            └ AppRouter (Suspense global + lazy)
```

> El i18n NO es un Context: es react-i18next importado como side-effect en `main.tsx`. Existe además `LabSSEProvider` a nivel del módulo de laboratorio (Server-Sent Events).

## Contextos / Providers

| Provider | Archivo | Propósito |
|----------|---------|-----------|
| Auth | `shared/providers/AuthProvider.tsx` | Carga `/api/auth/inicio`; `login()`/`logout()` navegan al Core; sin tokens locales |
| Theme | `shared/providers/ThemeProvider.tsx` | Tema claro/oscuro (MUI) con persistencia |
| Feature | `shared/providers/FeatureProvider.tsx` | Feature flags por plan SaaS (hook `useFeature`) |
| Lab SSE | `modules/laboratory/components/LabSSEProvider.tsx` | Eventos SSE del laboratorio |

## API Layer

`shared/services/api-client.ts` es el **único cliente Axios** del frontend:
- `baseURL` desde `VITE_API_URL` (default `/api`), `withCredentials: true`, timeout 30s
- **Request interceptor**: inyecta `X-CSRF-Token` (cookie) en métodos de escritura
- **Response interceptor**: 401 → redirección única al login del Core; toasts de error i18n; respeta cancelaciones
- La autenticación viaja en la cookie `app_session` del Core (misma origin); no hay Bearer ni refresh propio
- Servicios adicionales: `analytics.ts`, `pricing.service.ts`

## Autenticación en el SPA

- `AuthProvider` hace `GET /api/auth/inicio` y mapea la respuesta a `JwtUser`.
- `login()` y `logout()` hacen navegación completa a `/api/auth/login` y `/auth/logout`.
- En `401`, el interceptor llama al `unauthorizedHandler` una sola vez y redirige al Core.
- Las rutas protegidas dependen del guard del backend; sin sesión, el Core intercepta.

---

Tags: #frontend #arquitectura #react #sso
