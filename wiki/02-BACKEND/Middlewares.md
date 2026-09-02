# Middlewares

> Pipeline de middlewares Express en orden de ejecución (según `src/app.ts`).

## Pipeline Completo (orden real)

```mermaid
graph LR
    A[Request] --> B[Security: Helmet + HPP + Permissions-Policy]
    B --> C[Compression gzip]
    C --> D[GET /health]
    D --> E[CORS whitelist]
    E --> F[Cookie Parser COOKIE_SECRET]
    F --> G[JSON body 100KB]
    G --> H[CSRF double-submit]
    H --> I[Optional Auth JWT]
    I --> J[Tenant Middleware + RLS]
    J --> K[Session Activity]
    K --> L[CorrelationId X-Request-ID]
    L --> M[Request Logger]
    M --> N[Rate Limit Global]
    N --> O[Rate Limit Auth]
    O --> P[Rate Limit PHI]
    P --> Q[Routers de módulos]
    Q --> R[Feature Flag + Validate Zod + RBAC]
    R --> S[Handler]
    S --> T[Error Handler]
```

## Middlewares por Orden

| # | Archivo | Propósito |
|---|---------|-----------|
| 1 | `security.middleware.ts` | Helmet (CSP, HSTS, frameguard) + HPP + Permissions-Policy + `validateEnvSecurity` |
| 2 | `compression` | Respuestas gzip |
| 3 | `healthHandler` | `GET /health` y `GET /api/health` (DB, pool, stripe) |
| 4 | `cors` | Whitelist localhost:5173 + FRONTEND_URL + RENDER_EXTERNAL_URL, `credentials: true` |
| 5 | `cookieParser(COOKIE_SECRET)` | Parsea cookies firmadas |
| 6 | `express.json` | Body size limit 100KB |
| 7 | `csrf.middleware.ts` | CSRF double-submit: emite cookie `csrf_token`, verifica `x-csrf-token` |
| 8 | `auth.middleware.ts` | `optionalAuth` (extrae JWT sin rechazar), `authMiddleware`, `authorize(...roles)` |
| 9 | `tenant.middleware.ts` | Resuelve tenant (header/JWT) y ejecuta `set_tenant_id()` para RLS |
| 10 | `sessionActivity.middleware.ts` | `trackActivity` updates `last_activity_at` (throttle 5 min, purge 10 min) |
| 11 | `correlationId.middleware.ts` | Genera/reutiliza `X-Request-ID` |
| 12 | `requestLogger.middleware.ts` | Log `método ruta status duración` con body saneado |
| 13 | `globalLimiter` | 500 req / 15 min (skip `/health`) |
| 14 | `authLimiter` | 10 req / 15 min en `/api/auth` |
| 15 | `phiWriteLimiter` | 30 req / 15 min en `/api/clinical-records` |
| 16 | Routers | 23 módulos montados bajo `/api` |
| 17 | `errorHandler.middleware.ts` | `notFoundHandler` (404) + `errorHandler` (sin stack en prod) |

## Rate Limiting Detallado

| Nivel | Ventana | Máx | Rutas |
|-------|---------|-----|-------|
| Global | 15 min | 500 | Todas excepto /health |
| Auth | 15 min | 10 | `/api/auth/*` |
| PHI Write | 15 min | 30 | `/api/clinical-records/*` |
| Guest booking | 1 hora | 5 | `/api/guest/booking` |
| Guest lookup (RUT) | 15 min | 3 | `/api/guest/bookings/:rut` |
| SaaS onboard | 1 hora | 3 | `/api/saas/onboard` |

## Middlewares de Autorización (por ruta)

| Middleware | Propósito |
|------------|-----------|
| `authMiddleware` | Valida JWT + token_version + active + tenant; inyecta `req.user` |
| `optionalAuth` | Igual pero no falla sin token (rutas públicas parciales) |
| `authorize('admin', 'doctor')` | RBAC por lista blanca de roles |
| `requireFeature('laboratory')` | Gating por feature flag del plan SaaS (403 + PremiumLocked) |
| `validateZod(schema, source)` | Validación y parseo de body/params/query |

---

Tags: #middleware #backend #pipeline