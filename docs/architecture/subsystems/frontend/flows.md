# SUB-1 — Flujos (SPA Frontend)

## F1 — Arranque de la aplicación
```
index.html
  └─ main.tsx: createRoot(#root).render(<StrictMode>)
        QueryClientProvider(queryClient)
          BrowserRouter
            AppThemeProvider   → lee localStorage('theme_mode') / prefers-color-scheme
              AuthProvider     → useEffect: refreshSession()
                FeatureProvider→ effect: si user → GET /saas/features
                  ErrorBoundary
                    AppRouter  → <Suspense> + <Routes>
```
Evidencia: `main.tsx:24-50`, `ThemeProvider.tsx:16-21,334-361`,
`AuthProvider.tsx:57-107`, `FeatureProvider.tsx:31-38`.

## F2 — Restauración de sesión (boot)
```
AuthProvider.useEffect
  → refreshSession()  [POST /auth/refresh con withCredentials + X-CSRF-Token]
  → 200: announceAccessToken(data.access_token)
         si localStorage('auth_logout_pending') === '1':
            POST /auth/logout  → limpiar estado (evita re-login fantasma)
         si no: setUser(normalizeUser(data.user))
  → 401/400: limpiar user + localStorage('auth_user')  (sesión inválida)
  → red/5xx: setUser(null) sin confiar en localStorage
  → finally: isLoading = false
```
Evidencia: `AuthProvider.tsx:57-107`.

## F3 — Login (incl. 2FA y demo)
```
LoginPage / LandingPage
  → AuthProvider.login(email, password, totp_token?, captcha_token?, tenant_id?)
      → POST /auth/login
      → if data.requires_2fa → return (UI va a /2fa)
      → announceAccessToken(data.access_token)
      → setUser(normalizeUser(data.user))
      → navigate(getRedirectPath(user.role))
```
Demo: `LoginPage.tsx:80` y `LandingPage.tsx:808` invocan `login(DEMO_EMAIL, DEMO_PASSWORD, …)`
con constantes hardcodeadas (FND-R1). Evidencia: `AuthProvider.tsx:120-126`, `role.utils.ts:5-22`.

## F4 — Ciclo de request autenticado y refresh (401)
```
Componente/hook → apiClient.request
  interceptor request:  Authorization: Bearer <memoria>
                        si método ≠ GET/HEAD/OPTIONS y existe cookie csrf_token
                          → X-CSRF-Token
  ┌ response 2xx → resolver
  └ response 401 (no /auth/refresh, no _retry)
        si isRefreshing → encolar en refreshSubscribers
        si no:
          _retry = true; isRefreshing = true
          await refreshSession()  (refreshPromise único)
            → 200: announceAccessToken(); reintentar original con nuevo token
                   resolver suscriptores
            → fallo: setAccessToken(null); suscriptores(null);
                     onUnauthorized() → AuthProvider limpia y navega '/'
          finally: isRefreshing = false
  otro estado (400/403/404/409/429/500/red) → toast según i18n y reject
```
Evidencia: `api-client.ts:92-199`, `AuthProvider.tsx:109-118`.

## F5 — Coordinación multi-pestaña
```
login o refresh en pestaña A
  → announceAccessToken(token)
       setAccessToken(token)
       BroadcastChannel('vitaria-auth').postMessage({type:'auth_token', access_token})
  pestaña B (listener) → si access_token ≠ actual → accessToken = recibido
```
Evidencia: `api-client.ts:21-45`.

## F6 — Navegación con guardas de rol y de plan
```
Usuario navega a /ruta
  AppRouter → ProtectedRoute(allowedRoles)
      isLoading → <LoadingState/>
      !auth     → <Navigate to="/"/>
      rol ∉ allowedRoles → <Navigate to=getRedirectPath(rol)/>
      ok → children
  (si aplica) FeatureRoute(featureKey)
      loading → <LoadingState/>
      !hasFeature → <PremiumLocked/>
      ok → <Outlet/>
```
Evidencia: `AppRouter.tsx:137-161`, `FeatureProvider.tsx:40-42`.

## F7 — Consentimiento y analítica
```
initAnalytics()  → si VITE_GA_MEASUREMENT_ID → inyecta gtag (send_page_view:false)
trackPageView()  → solo si consentimiento.analytics === true
ConsentBanner    → persiste localStorage('vitaria_cookie_consent')
```
Evidencia: `analytics.ts:23-59`, `ConsentBanner.tsx`.

## F8 — Logout (tolerante a fallos)
```
logout()
  setLogoutPending(true)          # intención persistida PRIMERO
  loop 3×: POST /auth/logout  → éxito: setLogoutPending(false); break
                                → fallo: delay 400·2^n
  setAccessToken(null); setUser(null); removeItem('auth_user'); navigate('/')
```
Evidencia: `AuthProvider.tsx:128-162`.

## F9 — Tematización
```
toggleTheme() → setMode(light|dark) → localStorage('theme_mode')
useEffect(mode) → document.documentElement.setAttribute('data-theme', mode)
useMemo(buildTheme(mode)) → MuiThemeProvider(theme) + CssBaseline
```
Evidencia: `ThemeProvider.tsx:334-361`.
