# SUB-2 — Inventario de archivos (Nivel 4)

## Backend

| Archivo | Líneas | ID | Tipo | Entry/Exit |
|---|---|---|---|---|
| `src/modules/auth/auth.routes.ts` | 28 | MOD-b-auth-route | Router | importado por `app.ts:43`, montado `app.ts:265` |
| `src/modules/auth/auth.schema.ts` | 50 | MOD-b-auth-schema | Zod schemas | importado por `auth.routes.ts:4` |
| `src/modules/auth/auth.controller.ts` | 206 | MOD-b-auth-controller | Controllers | importado por `auth.routes.ts:2` |
| `src/modules/auth/auth.service.ts` | 962 | MOD-b-auth-service | Service+SQL | importado por `auth.controller.ts:2` |
| `src/middlewares/auth.middleware.ts` | 165 | MW-auth | Middleware | `authMiddleware`, `optionalAuth`, `authorize`, `setSecurityHeaders`; usado por ~todas las rutas protegidas |
| `src/middlewares/validate.middleware.ts` | 30 | MW-validate | Middleware | `validateZod` usado por todos los módulos |
| `src/middlewares/tenant.middleware.ts` | 91 | MW-tenant | Middleware | `app.ts:190` |
| `src/middlewares/sessionActivity.middleware.ts` | — | MW-sessionActivity | Middleware | `app.ts:191` (`trackActivity`) |
| `src/shared/jwt.service.ts` | 34 | SVC-jwt | Shared service | `jwtManager` |
| `src/shared/sessions.service.ts` | 86 | SVC-sessions | Shared service | listar/revocar dispositivos |
| `src/shared/crypto.service.ts` | 65 | SVC-crypto | Shared service | hash/encrypt/HMAC |
| `src/shared/db.ts` | 189 | SVC-db | Shared service | 3 pools + `tenantContext` + wrapper RLS |

## Frontend

| Archivo | Líneas | ID | Tipo |
|---|---|---|---|
| `frontend/src/shared/services/api-client.ts` | 200 | MOD-f-api-client | HTTP client / interceptores |
| `frontend/src/shared/providers/AuthProvider.tsx` | 192 | MOD-f-auth-provider | Context provider |
| `frontend/src/shared/types/api.types.ts` | — | MOD-f-api-types | Tipos (`JwtUser`, `AuthResponse`) |
| `frontend/src/shared/utils/role.utils.ts` | — | MOD-f-role-utils | RBAC cliente |
| `frontend/src/shared/constants/permissions.ts` | — | MOD-f-permissions | Matriz permisos |
| `frontend/src/modules/auth/pages/LoginPage.tsx` | — | MOD-f-login-page | Página |
| `frontend/src/modules/auth/pages/RegisterPage.tsx` | — | MOD-f-register-page | Página |
| `frontend/src/modules/auth/pages/ForgotPasswordPage.tsx` | — | MOD-f-forgot-page | Página |
| `frontend/src/modules/2fa/pages/TwoFAPage.tsx` | — | MOD-f-2fa-page | Página |
| `frontend/src/modules/2fa/services/two-fa.service.ts` | — | MOD-f-2fa-service | Service |
| `frontend/src/modules/2fa/hooks/useTwoFA.ts` | — | MOD-f-2fa-hook | Hook |

## Pruebas existentes (verificar en Fase 11)

`tests/unit/auth.controller.test.js`, `auth.service.test.js`, `auth.schema.test.js`, `auth.middleware.test.js`, `auth-refresh-2fa.service.test.js`, `jwt.service.test.js`, `crypto.service.test.js`, `sessions.service.test.js`, `security.middleware.test.js`, `csrf.middleware.test.js`, `validate.middleware.test.js`, `sessionActivity.middleware.test.js`, `base32.test.js`, `rut.test.js`, `tenant.middleware.test.js`, `tests/integration/auth.routes.test.js`.
