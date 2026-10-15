# SUB-4 — Módulos y capas

| ID | Unidad | Tipo | Archivo | Responsabilidad | LOC |
|---|---|---|---|---|---|
| SUB4-U1 | security.middleware | Middleware | `src/middlewares/security.middleware.ts` | helmet/CSP, hpp, Permissions-Policy, `validateEnvSecurity` | 121 |
| SUB4-U2 | csrf.middleware | Middleware | `src/middlewares/csrf.middleware.ts` | Double-submit cookie CSRF | 36 |
| SUB4-U3 | auth.middleware | Middleware | `src/middlewares/auth.middleware.ts` | `authMiddleware`, `optionalAuth`, `authorize`, headers no-cache | 165 |
| SUB4-U4 | tenant.middleware | Middleware | `src/middlewares/tenant.middleware.ts` | Resolución de tenant + PUBLIC_PATHS (ver SUB-3) | ~91 |
| SUB4-U5 | errorHandler.middleware | Middleware | `src/middlewares/errorHandler.middleware.ts` | Respuestas de error uniformes | ~50 |
| SUB4-U6 | validate.middleware | Middleware | `src/middlewares/validate.middleware.ts` | `validateZod` (body/query/params) | 1249 B |
| SUB4-U7 | requestLogger.middleware | Middleware | `src/middlewares/requestLogger.middleware.ts` | Log de request + `stripSensitiveFields` | ~30 |
| SUB4-U8 | correlationId.middleware | Middleware | `src/middlewares/correlationId.middleware.ts` | ID de correlación | 540 B |
| SUB4-U9 | metrics.middleware | Middleware | `src/middlewares/metrics.middleware.ts` | prom-client | 876 B |
| SUB4-U10 | sessionActivity.middleware | Middleware | `src/middlewares/sessionActivity.middleware.ts` | `trackActivity` (última actividad) | 1773 B |
| SUB4-U11 | crypto.service | Shared | `src/shared/crypto.service.ts` | AES-256-GCM, HMAC auditoría, `hashToken` | 77 |
| SUB4-U12 | jwt.service | Shared | `src/shared/jwt.service.ts` | Firma/verificación HS256 | ~40 |
| SUB4-U13 | sanitize | Shared | `src/shared/sanitize.ts` | Sanitización/redacción | 64 |
| SUB4-U14 | app.ts (seguridad) | Bootstrap | `src/app.ts:69-261` | CORS, limiters, cadena de middlewares | — |

## Notas

- **SUB4-U1** valida entorno **en arranque** (`validateEnvSecurity`) — los secretos obligatorios fallan el boot si faltan.
- **SUB4-U2** es la única defensa CSRF; no usa librería (`csurf` deprecada).
- **SUB4-U13** existe pero no está cableado en validación (FND-F3).
- **SUB4-U11/U12** son mono-secreto: `hashToken` comparte `AUDIT_HMAC_SECRET` (FND-A3).

## Patrón general

Toda la seguridad transversal vive en `src/middlewares/*` y `src/shared/*`, aplicada en `app.ts` con un orden explícito. Los limiters y CORS se definen inline en `app.ts` (no hay módulo `config/security`).
