# SUB-2 — Módulos internos (Nivel 3-4)

## Módulo backend `auth` (`src/modules/auth/`)

Arquitectura en 4 capas (patrón modular del proyecto):

| Capa | Archivo | Símbolos | Responsabilidad | Evidencia |
|---|---|---|---|---|
| Route | `auth.routes.ts` (28) | `router` (15 endpoints) | registro de rutas + orden middleware | `:7-26` |
| Schema | `auth.schema.ts` (50) | 7 esquemas Zod + `passwordSchema` | contrato de entrada | `:1-50` |
| Controller | `auth.controller.ts` (206) | `register, login, refresh, logout, logoutAll, changePassword, get2FAStatus, enable2FA, verifyAndEnable2FA, disable2FA, inviteInfo, forgotPassword, resetPassword, getJWKS, resetAdmin, getMyProfile, getSessions, revokeSession` + `setAuthCookies/clearAuthCookies` | HTTP ↔ servicio, cookies, validación de `req.user` | `:22-206` |
| Service | `auth.service.ts` (962) | `register, login, refreshToken, logout, logoutAll, changePassword, generateSecret, verifyToken, enable2FA, verifyAndEnable2FA, disable2FA, is2FARequired, forgotPassword, resetPassword, resetAdminPassword` + helpers `generateAccessToken, validatePassword, verifyCaptcha, getTenantBilling, isDemoLogin, revokeFamilyForSession, revokeAllUserRefreshTokens, getSessionPolicy` | lógica de negocio, SQL, TOTP | `:1-962` |

> **Observación:** `auth.service.ts` (962 líneas) mezcla **3 dominios** (credenciales+sesiones, 2FA, password-reset) y contiene SQL inline extenso. Candidato a división (FND-A8, media).

## Módulos compartidos consumidos (Nivel 3)

| Símbolo | Archivo | Uso desde auth | Evidencia |
|---|---|---|---|
| `jwtManager` | `src/shared/jwt.service.ts` | `sign`/`verify` HS256 | `auth.service.ts:111`, `auth.middleware.ts:30` |
| `getJWKS` | `src/shared/jwt.service.ts` | devuelve `{keys:[]}` | `jwt.service.ts:39-41` |
| `hashToken, encrypt, decrypt, computeHmac` | `src/shared/crypto.service.ts` | hash de tokens, cifrado TOTP | `auth.service.ts:12,356` |
| `listUserSessions, revokeUserSession, revokeAllUserSessions, createUserSession, touchUserSession` | `src/shared/sessions.service.ts` | gestión de dispositivos | `auth.controller.ts:79,89`; `auth.service.ts:669` |
| `sendEmail` | `src/shared/email.service.ts` | correo de reset | `auth.service.ts:858` |
| `base32Encode, base32Decode` | `src/shared/base32.ts` | secreto TOTP | `auth.service.ts:14,705,720` |
| `validateRut, cleanRut, formatRut` | `src/shared/rut.ts` | validación de RUT Chile | `auth.service.ts:4,155-157` |
| `pool, readPool, superAdminPool, tenantContext` | `src/shared/db.ts` | acceso a datos / RLS | `auth.service.ts:1,274` |
| `verifyInviteToken` | `src/modules/doctor/doctor.service.ts` | registro por invitación | `auth.service.ts:6,145` |
| `waitForSeed` | `src/shared/seed-status.ts` | espera de seed en login | `auth.controller.ts:61` |
| `DEMO_TENANT_ID, DEMO_ADMIN_EMAIL` | `src/seed/admin.seed.ts` | bypass de captcha demo | `auth.service.ts:3,215-217` |

## Middlewares que participan (Nivel 4)

| Middleware | Orden | Efecto sobre SUB-2 | Evidencia |
|---|---|---|---|
| `securityMiddleware` (helmet/hpp) | 1º | cabeceras | `app.ts:122` |
| `cors` (allowlist + credentials) | — | cookies cross-origin | `app.ts:153-169` |
| `cookieParser(COOKIE_SECRET)` | — | parsea `access_token`/`refresh_token` | `app.ts:181` |
| `csrfProtection` | — | valida `X-CSRF-Token` en mutaciones | `app.ts:188` |
| `optionalAuth` | global | `req.user` sin verificar sesión | `app.ts:189`, `auth.middleware.ts:136` |
| `tenantMiddleware` | global | `req.tenant_id`, `tenantContext` (RLS) | `app.ts:190`, `tenant.middleware.ts:45-91` |
| `authMiddleware` | por ruta | verifica JWT + `token_version` + sesión (revoked/expired) + tenant | `auth.middleware.ts:58-134` |
| `authorize(roles)` | por ruta | RBAC | `auth.middleware.ts:153-165` |
| `validateZod(schema)` | por ruta | parsea body, 400 en fallo | `validate.middleware.ts:8-29` |
| `asyncHandler` | por controlador | propaga errores async | `auth.controller.ts:3` |

## Frontend `auth` + `2fa` (Nivel 4)

| Archivo | Símbolos | Rol |
|---|---|---|
| `frontend/src/shared/services/api-client.ts` (200) | `apiClient, refreshSession, setAccessToken, announceAccessToken, getAccessToken, setUnauthorizedHandler` | axios + interceptores, refresh, CSRF, cross-tab (BroadcastChannel) |
| `frontend/src/shared/providers/AuthProvider.tsx` (192) | `AuthProvider, useAuth` | estado de sesión, login/logout, restauración al montar |
| `frontend/src/modules/auth/pages/{LoginPage,RegisterPage,ForgotPasswordPage,NotFoundPage}.tsx` | componentes de página | UI |
| `frontend/src/modules/2fa/{pages/TwoFAPage.tsx,hooks/useTwoFA.ts,services/two-fa.service.ts,types/two-fa.types.ts}` | 2FA UI | 2FA |
| `frontend/src/shared/utils/role.utils.ts` | `hasPermission, normalizeRole` | RBAC cliente |
| `frontend/src/shared/constants/permissions.ts` | matriz de permisos | RBAC cliente |
