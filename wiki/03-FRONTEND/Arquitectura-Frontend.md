# Arquitectura Frontend

> Estructura y organización del frontend React (2026-09-01 actualizado contra el código real).

## Estructura de Directorios

```
frontend/src/
├── main.tsx                # Entry: QueryClient > BrowserRouter > Theme > Auth > Feature > ErrorBoundary > AppRouter
├── app/
│   ├── config/             # fonts.ts, global.css
│   └── router/AppRouter.tsx  # 51+ rutas, lazy loading, ProtectedRoute, FeatureRoute
├── modules/                # 27 módulos por feature (208 archivos)
│   ├── auth/               # pages: Login, Register, ForgotPassword, NotFound
│   ├── laboratory/         # el módulo más extenso (10 páginas, ~30 componentes, LabSSEProvider)
│   ├── super-admin/        # 7 páginas
│   ├── bookings/, doctors/, patients/, clinical-records/, prescriptions/,
│   ├── medical-history/, laboratory/, billing/, analytics/, reports/, audit/,
│   ├── settings/, notifications/, specialties/, holidays/, availability/,
│   ├── waitlist/, clinical-templates/, 2fa/, dashboard/, landing/, … 
├── shared/                 # 34 archivos
│   ├── components/         # layouts (Auth/Dashboard/Patient/SidebarItem) + ui/ + ErrorBoundary + WithFeature…
│   ├── constants/          # navigation.tsx (22 ítems por rol), permissions.ts
│   ├── hooks/              # useFeature.ts
│   ├── providers/          # AuthProvider, FeatureProvider, ThemeProvider
│   ├── services/           # api-client.ts (instancia Axios central)
│   ├── types/              # api.types.ts
│   └── utils/              # role.utils, rut, error-sanitizer, localeUtils, pdf, logger, animations
├── i18n/                   # i18n.ts + locales/{es,en,pt,fr}.json (66 namespaces c/u)
└── test/                   # 178 archivos de test (setup.ts + i18n-keys.test.ts)
```

## Provider Stack

```
QueryClientProvider (TanStack Query)
  → BrowserRouter
    → AppThemeProvider (MUI claro/oscuro)
      → AuthProvider (JWT, 2FA)
        → FeatureProvider (feature flags SaaS)
          → ErrorBoundary
            → AppRouter (Suspense global + lazy)
```

> El i18n NO es un Context: es react-i18next importado como side-effect en `main.tsx`. Existe además `LabSSEProvider` a nivel del módulo de laboratorio (Server-Sent Events).

## Contextos / Providers

| Provider | Archivo | Propósito |
|----------|---------|-----------|
| Auth | `shared/providers/AuthProvider.tsx` | Login/logout/register, token en memoria, 2FA |
| Theme | `shared/providers/ThemeProvider.tsx` | Tema claro/oscuro (MUI) con persistencia |
| Feature | `shared/providers/FeatureProvider.tsx` | Feature flags por plan SaaS (hook `useFeature`) |
| Lab SSE | `modules/laboratory/components/LabSSEProvider.tsx` | Eventos SSE del laboratorio |

## API Layer

`shared/services/api-client.ts` es el **único cliente Axios** del frontend:
- `baseURL` desde `VITE_API_URL` (default `/api`), `withCredentials: true`, timeout 30s
- **Request interceptor**: inyecta `Authorization: Bearer`, `X-Tenant-Id` (localStorage) y `X-CSRF-Token`
- **Response interceptor**: captura CSRF/tenant de los headers, refresh automático con cola de subscribers, toasts de error i18n
- Cada módulo expone su propio `*.service.ts` (24 services) que importa este cliente

---

Tags: #frontend #arquitectura #react