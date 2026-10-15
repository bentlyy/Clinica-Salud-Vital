# SUB-1 — Diagramas (SPA Frontend)

## D1. Composición de providers y árbol de componentes

```mermaid
flowchart TD
  HTML["index.html #root"] --> MAIN["main.tsx"]
  MAIN --> QCP["QueryClientProvider"]
  QCP --> BR["BrowserRouter"]
  BR --> TP["AppThemeProvider (MUI light/dark)"]
  TP --> AP["AuthProvider (sesion)"]
  AP --> FP["FeatureProvider (plan)"]
  FP --> EB["ErrorBoundary (clase, retry)"]
  EB --> AR["AppRouter"]
  AR --> SUS["Suspense + Routes"]
  SUS --> PUB["Rutas publicas (/,/login,/booking...)"]
  SUS --> DASH["DashboardLayout (roles)"]
  DASH --> PAGES["Paginas lazy modules/*"]
  AP --> TOAS["Toaster (react-hot-toast)"]
```

## D2. Ciclo de request autenticado con refresh (401)

```mermaid
sequenceDiagram
  participant C as Componente/hook
  participant AC as apiClient
  participant API as Backend /api
  C->>AC: request (Bearer en memoria + X-CSRF-Token)
  AC->>API: HTTP
  API-->>AC: 401
  AC->>AC: isRefreshing? encolar subscribers
  AC->>API: POST /auth/refresh (withCredentials + CSRF)
  alt refresh OK
    API-->>AC: access_token
    AC->>AC: announceAccessToken + reintentar original
    AC-->>C: respuesta 2xx
  else refresh falla
    AC->>AC: setAccessToken(null); subscribers(null)
    AC->>AP: onUnauthorized()
    AC-->>C: reject(error)
  end
```

## D3. Guardas de ruta (rol y plan)

```mermaid
flowchart TD
  NAV["Navegacion a /ruta"] --> PR{"ProtectedRoute"}
  PR -->|isLoading| LS["LoadingState"]
  PR -->|no auth| HOME["Navigate /"]
  PR -->|rol no permitido| RED["Navigate getRedirectPath(rol)"]
  PR -->|ok| FR{"FeatureRoute?"}
  FR -->|loading| LS2["LoadingState"]
  FR -->|sin plan| PL["PremiumLocked"]
  FR -->|ok| OUT["Outlet / children"]
  PR -->|sin FeatureRoute| OUT
```

## D4. Sesion multi-pestana y logout

```mermaid
flowchart LR
  subgraph Pestana A
    A1["login/refresh"] --> A2["announceAccessToken"] --> A3["BroadcastChannel('vitaria-auth')"]
  end
  A3 --> B1["Pestana B listener"]
  B1 --> B2["accessToken = recibido"]
  subgraph Logout
    L1["setLogoutPending(true)"] --> L2["POST /auth/logout x3 (backoff)"]
    L2 --> L3["limpiar token/user/localStorage"]
    L3 --> L4["navigate('/')"]
  end
```
