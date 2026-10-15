# SUB-4 — Inventario de archivos

## Archivos propios

| Archivo | LOC | Rol |
|---|---|---|
| `src/middlewares/security.middleware.ts` | 121 | helmet/CSP, hpp, Permissions-Policy, `validateEnvSecurity` |
| `src/middlewares/csrf.middleware.ts` | 36 | Double-submit cookie CSRF (`csrf_token`, `x-csrf-token`) |
| `src/middlewares/auth.middleware.ts` | 165 | `authMiddleware`, `optionalAuth`, `authMiddlewareNoCache`, `authorize`, `setSecurityHeaders` |
| `src/middlewares/tenant.middleware.ts` | ~91 | Resolución de tenant / PUBLIC_PATHS (ver SUB-3) |
| `src/middlewares/errorHandler.middleware.ts` | 40 | `errorHandler`, `notFoundHandler`; `notifyCritical` en 5xx |
| `src/middlewares/validate.middleware.ts` | 30 | `validateZod(schema, source)` |
| `src/middlewares/requestLogger.middleware.ts` | 24 | Log por request + `stripSensitiveFields` |
| `src/middlewares/correlationId.middleware.ts` | ~15 | `x-request-id` |
| `src/middlewares/metrics.middleware.ts` | ~25 | Métricas prom-client |
| `src/middlewares/sessionActivity.middleware.ts` | 47 | `trackActivity` (throttle 5 min, cleanup 10 min) |
| `src/shared/crypto.service.ts` | 77 | AES-256-GCM, `hashToken` (HMAC) |
| `src/shared/jwt.service.ts` | ~40 | Firma/verificación HS256 |
| `src/shared/sanitize.ts` | 64 | `sanitizeText*`, `sanitizeRecordFields`, `stripSensitiveFields` |

## Transversales consumidos

| Archivo | Rol |
|---|---|
| `src/app.ts` | Montaje de la cadena + definición de limiters/CORS (`:69-261`) |
| `src/modules/auth/auth.controller.ts` | Set/clear de cookies de sesión (`:12-18,73,109`) |
| `src/utils/errors.ts` | `AppError`, `UnauthorizedError`, `ForbiddenError`, `BadRequestError`, `NotFoundError` |
| `src/shared/alerts.service.ts` | `notifyCritical` desde errorHandler |
| `src/utils/logger.ts` | winston |
| `src/config/sentry.ts` | `initSentry` |
| `db/security.sql` | RLS/roles (ver SUB-3) |

## Variables de entorno (validadas en arranque)

`JWT_SECRET`, `COOKIE_SECRET`, `AUDIT_HMAC_SECRET`, `DATABASE_URL` (obligatorias); `ENCRYPTION_KEY` (advierte); `RECAPTCHA_SECRET_KEY` (obligatoria en prod, **sin uso real**); `FRONTEND_URL`/`RENDER_EXTERNAL_URL` (CORS).

## Dependencias npm relevantes

`helmet`, `hpp`, `cors`, `express-rate-limit`, `cookie-parser`, `compression`, `sanitize-html`, `jsonwebtoken`, `bcrypt`, `prom-client`, `@sentry/node`.
