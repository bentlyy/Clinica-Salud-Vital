# SUB-4 — Seguridad transversal

> **Estado:** descripción AS-IS completada · **Certeza global:** confirmado (lectura de código).
> **Evidencia principal:** `src/middlewares/{security,csrf,auth,tenant,errorHandler}.middleware.ts`, `src/shared/{jwt,crypto.service,sanitize}.ts`, `src/app.ts:69-261`, `src/modules/auth/auth.controller.ts`; `db/security.sql`.

## 1. Propósito

Definir los **controles de seguridad transversales** de la API: cabeceras HTTP (helmet/CSP), CORS, rate limiting por tipo de endpoint, CSRF (double-submit cookie), autenticación/rol (JWT HS256 + sesión), validación de variables de entorno y secretos, cifrado de secretos TOTP, sanitización/redacción, y límites de tamaño/parámetros.

Es un subsistema **transversal** (no tiene “páginas”): se materializa como cadena de middlewares en `src/app.ts` y utilidades en `src/shared`.

## 2. Cadena de middlewares (`src/app.ts`)

Orden de aplicación (evidencia `src/app.ts:122-195,252-261`):

```
securityMiddleware (helmet + hpp + Permissions-Policy)   app.ts:122
compression                                               app.ts:123
CORS (allowlist + credentials)                            app.ts:153
static + SPA fallback (solo prod)                         app.ts:171-178
cookieParser(COOKIE_SECRET)                               app.ts:181
express.json({limit:'100kb', rawBody})                    app.ts:182-187
csrfProtection                                            app.ts:188
optionalAuth   ← decodifica JWT sin validar sesión        app.ts:189
tenantMiddleware                                          app.ts:190
trackActivity                                             app.ts:191
correlationId → requestLogger → metricsMiddleware         app.ts:193-195
globalLimiter (500/15min)                                 app.ts:252
authLimiter (login/register/forgot/reset)                 app.ts:256-259
sessionLimiter (refresh/logout)                           app.ts:260-261
…routers…
```

## 3. Controles implementados

### 3.1 Cabeceras (helmet) — `security.middleware.ts:32-56`
- CSP (`defaultSrc 'self'`, `frameAncestors 'none'`, `baseUri 'none'`, `formAction 'self'`); en desarrollo añade `'unsafe-eval'`/`'unsafe-inline'` a `script-src`.
- `hsts` (1 año, subdominios, preload), `frameguard deny`, `noSniff`, `referrerPolicy: strict-origin-when-cross-origin`, `crossOriginOpenerPolicy: same-origin`, `crossOriginResourcePolicy: cross-origin`, `originAgentCluster`, `permittedCrossDomainPolicies: none`.
- `hpp()` (anti HTTP Parameter Pollution).
- Cabecera manual `Permissions-Policy` deshabilitando geolocation/camera/microphone/payment/usb/sensores.
- `setSecurityHeaders` (auth) añade `Cache-Control: no-store` en respuestas autenticadas (`auth.middleware.ts:42-48`).

### 3.2 CORS — `src/app.ts:147-169`
Allowlist = `localhost:5173` + `FRONTEND_URL` + `RENDER_EXTERNAL_URL`; `credentials: true`; `maxAge 86400`; en producción sin orígenes → error de arranque. Origen ausente (`!origin`) se **permite** (clientes no-navegador).

### 3.3 Rate limiting — `src/app.ts:197-261` (**store en memoria, por instancia**)
| Limiter | Ventana | Máx | Clave | Aplica a |
|---|---|---|---|---|
| `globalLimiter` | 15 min | 500 | `tenant:ip` o `ip` | todo (excepto health/metrics) |
| `authLimiter` | 15 min | 10 | `ip + body.email` | login, register, forgot, reset |
| `sessionLimiter` | 15 min | 60 | `user.id` o `ip` | refresh, logout |
| `phiWriteLimiter` | 15 min | 30 | `phi:tenant:user/ip` | `/api/clinical-records` |

### 3.4 CSRF (double-submit cookie) — `csrf.middleware.ts`
Cookie `csrf_token` no-httpOnly, `sameSite: lax`, `secure` en prod; métodos seguros (GET/HEAD/OPTIONS) pasan; para el resto exige `X-CSRF-Token === cookie`. Ver FND-F2 (bypass en primera petición sin cookie).

### 3.5 Autenticación/sesión
- JWT **HS256** con algoritmo fijado en `verify` (`jwt.service.ts:13,22`) — mitiga *alg confusion*; sin RS256/JWKS (FND-A2).
- `authMiddleware` (protegido) valida `token_version`, `active`, `revoked_at`, `expires_at` de `user_sessions` (`auth.middleware.ts:78-130`).
- `optionalAuth` (global) **solo** firma-verifica → FND-A6.
- Cookies de sesión: `access_token`/`refresh_token` httpOnly, secure(prod), sameSite lax (`auth.controller.ts:12-18`).
- Cookies firmadas con `COOKIE_SECRET` separado de `JWT_SECRET`.

### 3.6 Secretos y entorno — `security.middleware.ts:58-121`
- Obligatorios: `JWT_SECRET` (≥32, no default), `COOKIE_SECRET` (≥32, ≠ JWT_SECRET), `AUDIT_HMAC_SECRET` (≥32), `DATABASE_URL`.
- `ENCRYPTION_KEY` advierte si falta (2FA no disponible).
- **`RECAPTCHA_SECRET_KEY` obligatoria en producción** y bloquea la test-key de Google. La verificación real (`api/siteverify`) existe en **login** (`auth.service.ts:219-249,258`) y en **`POST /saas/onboard`** (`saas.controller.ts:158-186`); **no** se aplica en `register` (FND-F1). El login demo omite captcha por diseño.
- Cifrado TOTP: `aes-256-gcm` con PBKDF2 100k + salt por registro (`crypto.service.ts:34-58`).
- `hashToken` = HMAC-SHA256 con `AUDIT_HMAC_SECRET` (FND-A3).
- Password hashing: bcrypt cost **12** (`src/seeds/*`).

### 3.7 Sanitización/redacción — `src/shared/sanitize.ts`
- `sanitizeTextStrict` **se aplica en `clinical-record.service.ts`**; `sanitizeText`/`sanitizeRecordFields` no se usan; `medical-history` no sanitiza (FND-C7). Aplicación inconsistente entre módulos (FND-F3).
- `stripSensitiveFields` (redacción de logs) usado por `requestLogger.middleware.ts`.

## 4. Roles/actores

No aplica autorización por rol aquí (eso es `authorize()`/SUB-3); este subsistema define **cómo** se protege la superficie, no **quién** puede.

## 5. Findings de SUB-4 (ver `05-findings.md`, FND-F1…F7)

Destacan: **FND-F1 🟡** (captcha no verificado en `register`), **FND-F2 🟡** (bypass CSRF sin cookie previa), **FND-F3 🟢** (sanitización inconsistente entre módulos), **FND-F7** (reexpone FND-A6).

## 6. Notas de NO VERIFICADO

- Valores reales de `JWT_SECRET`/`COOKIE_SECRET`/`RECAPTCHA_SECRET_KEY` en producción (no se leen secretos — `render.yaml`/dashboard).
- Efectividad de `trust proxy` en Render para la clave de los limiters (Fase 10).
- Si el frontend envía `X-CSRF-Token` en todas las mutaciones (Fase 6).
- Si se usa `express.urlencoded` en algún router (no aparece en `app.ts`); `hpp` podría ser no-op.
