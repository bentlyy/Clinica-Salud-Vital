# Middlewares

> Pipeline de middlewares Express en orden de ejecución.

## Pipeline Completo

```mermaid
graph LR
    A[Request] --> B[Security: Helmet + HPP]
    B --> C[CORS]
    C --> D[Compression]
    D --> E[Request Logger]
    E --> F[Rate Limit Global]
    F --> G[Body Parser JSON]
    G --> H[Cookie Parser]
    H --> I[Tenant Middleware]
    I --> J[Auth JWT]
    J --> K[Session Activity]
    K --> L[Role Authorization]
    L --> M[Feature Flag]
    M --> N[Validate Zod]
    N --> O[Audit Log]
    O --> P[Handler]
    P --> Q[Error Handler]
```

## Middlewares por Orden

| # | Archivo | Propósito |
|---|---------|-----------|
| 1 | `security.middleware.ts` | Helmet (CSP, HSTS, frameguard), HPP |
| 2 | CORS | Lista blanca de orígenes |
| 3 | Compression | Respuestas gzip |
| 4 | `requestLogger.middleware.ts` | Logging Winston con duración |
| 5 | Rate Limit | Global 500/15min, Auth 5/15min |
| 6 | `tenant.middleware.ts` | Resuelve tenant desde header/JWT |
| 7 | `auth.middleware.ts` | Verifica JWT, inyecta `req.user` |
| 8 | `sessionActivity.middleware.ts` | Actualiza `last_activity_at` |
| 9 | `feature.middleware.ts` | Gating de features por plan SaaS |
| 10 | `validate.middleware.ts` | Validación Zod de body/params/query |
| 11 | `asyncHandler.middleware.ts` | Wrapper try/catch para async handlers |
| 12 | `errorHandler.middleware.ts` | Manejo centralizado de errores |

## Rate Limiting Detallado

| Nivel | Ventana | Máx | Rutas |
|-------|---------|-----|-------|
| Global | 15 min | 500 | Todas excepto /health |
| Auth | 15 min | 5 | `/api/auth/login`, `/api/auth/register` |
| Guest booking | 1 hora | 5 | `/api/guest/booking` |
| Guest lookup | 15 min | 3 | `/api/guest/bookings/:rut` |
| SaaS onboard | 1 hora | 3 | `/api/saas/onboard` |

---

Tags: #middleware #backend #pipeline
