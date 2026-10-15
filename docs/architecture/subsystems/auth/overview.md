# SUB-2 — Autenticación y sesiones · Overview

> **Estado:** descomposición Etapa 2 completada (backend + consumo frontend). **Certeza:** confirmado salvo indicación.
> **Archivos base:** `src/modules/auth/*` (4), `src/middlewares/auth.middleware.ts`, `src/shared/{jwt,sessions,crypto}.service.ts`, `src/middlewares/validate.middleware.ts`, `src/shared/db.ts`, `src/middlewares/tenant.middleware.ts`, consumo en `frontend/src/shared/{services/api-client.ts,providers/AuthProvider.tsx}`.

## 1. Propósito y responsabilidades

Autenticación de usuarios (registro, login, 2FA TOTP, recuperación de contraseña), emisión y rotación de tokens (JWT de acceso + refresh opaco), gestión de sesiones por dispositivo, y cierre de sesión (individual / global). Autorización por rol (`authorize`) vive en el mismo middleware.

## 2. Modelo de tokens (AS-IS)

| Token | Formato | Almacenamiento | TTL | Evidencia |
|---|---|---|---|---|
| `access_token` | JWT HS256 (claims: `id, role, tenant_id, token_version, sid`) | cookie `httpOnly` (también `Authorization: Bearer`) | 15 min | `auth.service.ts:65,103-121`; `auth.controller.ts:23` |
| `refresh_token` | 40 bytes hex (opaco) | cookie `httpOnly` + hash en `refresh_tokens` | 30 días | `auth.service.ts:376-385`; `auth.controller.ts:24` |
| `csrf_token` | cookie legible por JS | cookie (no httpOnly) | — | `api-client.ts:55-61` |
| invite token | JWT (`signInvite`, 24 h) | query | 24 h | `jwt.service.ts:28-30` |
| reset token | 32 bytes hex, hash en `password_reset_tokens` | enlace email | 1 h | `auth.service.ts:843-852` |

- **Hash de tokens**: `hashToken` = HMAC-SHA256 con `AUDIT_HMAC_SECRET` (`crypto.service.ts:71-77`). ⚠️ se reutiliza el secreto de auditoría para los refresh tokens.
- **Cifrado TOTP en reposo**: AES-256-GCM con `ENCRYPTION_KEY` (`crypto.service.ts:34-58`), secreto guardado como `iv:tag:salt:ciphertext` (`auth.service.ts:756`).

## 3. Endpoints (montados en `/api/auth` — `src/app.ts:265`)

| Método | Ruta | Validación | Auth | Autorización | Controlador |
|---|---|---|---|---|---|
| GET | `/.well-known/jwks.json` | — | pública | — | `getJWKS` |
| GET | `/me` | — | `authMiddleware` | — | `getMyProfile` |
| GET | `/invite-info` | — | pública | — | `inviteInfo` |
| POST | `/register` | `registerSchema` | pública (+`authLimiter`) | — | `register` |
| POST | `/login` | `loginSchema` | pública (+`authLimiter`) | — | `login` |
| POST | `/refresh` | `refreshSchema` | cookie (+`sessionLimiter`) | — | `refresh` |
| POST | `/logout` | — | cookie/body (+`sessionLimiter`) | — | `logout` |
| POST | `/logout-all` | — | `authMiddleware` | — | `logoutAll` |
| GET | `/sessions` | — | `authMiddleware` | — | `getSessions` |
| DELETE | `/sessions/:id` | — | `authMiddleware` | — | `revokeSession` |
| POST | `/change-password` | `changePasswordSchema` | `authMiddleware` | — | `changePassword` |
| POST | `/2fa/enable` | — | `authMiddleware` | — | `enable2FA` |
| GET | `/2fa/status` | — | `authMiddleware` | — | `get2FAStatus` |
| POST | `/2fa/verify` | — | `authMiddleware` | — | `verifyAndEnable2FA` |
| POST | `/2fa/disable` | — | `authMiddleware` | — | `disable2FA` |
| POST | `/forgot-password` | `forgotPasswordSchema` | pública (+`authLimiter`) | — | `forgotPassword` |
| POST | `/reset-password` | `resetPasswordSchema` | pública (+`authLimiter`) | — | `resetPassword` |
| POST | `/reset-admin` | `resetAdminSchema` | `authMiddleware` | `authorize('superadmin')` | `resetAdmin` |

Evidencia: `auth.routes.ts:9-26`; limiters en `src/app.ts:256-261`.

## 4. Esquemas Zod (SUB-2) — resumen (detalle en Fase 4)

`auth.schema.ts`: `registerSchema`, `loginSchema`, `refreshSchema` (vacío), `changePasswordSchema`, `forgotPasswordSchema`, `resetPasswordSchema`, `resetAdminSchema` — todos `.strict()`. `passwordSchema` reutilizado por register/change/reset.

## 5. Dependencias salientes

`jwt.service` (firma/verificación) · `crypto.service` (hash/encrypt/HMAC) · `sessions.service` (listar/revocar) · `email.service` (reset) · `base32` + `lib` TOTP · `seed/admin.seed` (constantes demo) · `doctor.service.verifyInviteToken` (registro por invitación) · `pool`/`readPool`/`superAdminPool` (`db.ts`) · `rut.js` · `error-codes`/`errors`.

## 6. Hallazgos candidatos (detalle y formalización: `docs/architecture/05-findings.md`)

| ID cand. | Descripción | Evidencia | Certeza |
|---|---|---|---|
| FND-A1 | `failed_attempts`/bloqueo de cuenta se actualiza y **luego se revierte con `ROLLBACK`** en login fallido → el lockout por 5 intentos **no persiste** | `auth.service.ts:318-325` (`UPDATE` + `ROLLBACK`) | confirmado (código) |
| FND-A2 | `.well-known/jwks.json` devuelve `{ keys: [] }`; no hay RS256/JWKS pese a `JWT_PRIVATE_KEY`/`JWT_PUBLIC_KEY` en `render.yaml:50-53` | `jwt.service.ts:39-41` | confirmado |
| FND-A3 | `AUDIT_HMAC_SECRET` se reutiliza como clave HMAC de tokens de sesión/reset | `crypto.service.ts:75-77` | confirmado |
| FND-A4 | Política de contraseña duplicada 3×: Zod (`auth.schema.ts:3-9`), `validatePassword` (`auth.service.ts:127-133`), inline en `resetPassword` (`:882-886`) | idem | confirmado |
| FND-A5 | Contrato login: el backend lanza 400 `AUTH_2FA_REQUIRED`; el frontend espera `data.requires_2fa` (`AuthProvider.tsx:122`) — posible rama muerta / desalineación | `auth.service.ts:347-350` vs `AuthProvider.tsx:122` | pendiente de verificar (`AuthResponse`) |
| FND-A6 | `optionalAuth` global establece `req.user` **sin** validar `token_version`/sesión (solo `authMiddleware` lo hace) | `auth.middleware.ts:136-145` | confirmado |
| FND-A7 | `register` es público y acepta `tenant_id` del body → creación de usuario en tenant arbitrario (riesgo multi-tenant) | `auth.controller.ts:56`, `auth.service.ts:142` | probable (requiere prueba con RLS) |

## 7. Riesgos / NO VERIFICADO

- RLS efectivo durante `register`/`changePassword` (usan `pool` tenant-scoped). No probado.
- `superAdminPool` en login: acceso cross-tenant deliberado (buscar usuario antes de conocer tenant) — correcto por diseño, pero amplía superficie (Fase 8).
- No se ejecutaron tests; su existencia se verifica en Fase 11 (`tests/unit/auth.*.test.js`, `tests/integration/auth.routes.test.js`).
