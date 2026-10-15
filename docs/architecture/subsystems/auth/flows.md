# SUB-2 — Flujos críticos (Nivel 6)

## 1. Login (`POST /api/auth/login`)

```
client → POST /api/auth/login {email, password, totp_token?, captcha_token?}
 global limiter(authLimiter: 10/15min ip+email) → securityMiddleware → cors
 → cookieParser → json(100kb) → csrfProtection → optionalAuth → tenantMiddleware
 → trackActivity → correlationId → requestLogger → metrics
 → validateZod(loginSchema)  [auth.schema.ts:21-27, .strict()]
 → controller.login  [auth.controller.ts:60-75]
     ├─ waitForSeed(30000)                        [seed-status]
     └─ authService.login(payload + ip + user_agent, req.body.tenant_id||req.tenant_id)
         ├─ verifyCaptcha(captcha_token, email, tenant)   [auth.service.ts:219-249]
         │    ├─ demo login (DEMO_TENANT + DEMO_ADMIN) y sin token → true (bypass)
         │    ├─ RECAPTCHA_SECRET_KEY ausente → true
         │    ├─ test key conocida → true (modo prueba)
         │    └─ fetch google recaptcha siteverify (timeout 10s) → data.success
         ├─ BEGIN ; set_config('app.tenant_id', tenant)      [:266-268]
         ├─ superAdminPool (BYPASSRLS) SELECT user por email+tenant [:274-297]
         │    └─ fallback: si 0 match y 1 candidato por email activo → tomar ese usuario
         ├─ si user.tenant_id → set_config efectivo          [:302-305]
         ├─ si !user → bcrypt.compare(dummy) + ROLLBACK + 400 AUTH_INVALID_CREDENTIALS
         ├─ bcrypt.compare(password, user.password)
         │    └─ si !isValid → UPDATE failed_attempts++ / locked_until ...
         │         *** ROLLBACK ***  [:318-327]  ← FND-A1: el incremento NO persiste
         ├─ si !active → ROLLBACK + 401
         ├─ si locked_until > now → ROLLBACK + 401            [:336-340]
         ├─ UPDATE failed_attempts=0, locked_until=NULL, last_activity_at=NOW() [:342]
         ├─ si totp_enabled:
         │    ├─ sin totp_token → ROLLBACK + 400 AUTH_2FA_REQUIRED
         │    └─ verifyToken(secret, token) inválido → 400    [:347-356]
         ├─ INSERT user_sessions (token hash, ip, ua, exp 30d) RETURNING id [:361-374]
         ├─ INSERT refresh_tokens (hash, family, session_id, token_version) [:381-385]
         └─ COMMIT
         ├─ generateAccessToken(HS256, 15m, claims incl. sid=sessionId) [:390-397]
         └─ getTenantBilling(tenant) → {currency, country_code}        [:399]
 → setAuthCookies(access_token 15m, refresh_token 30d, httpOnly/secure/sameSite=lax) [auth.controller.ts:22-25]
 → 200 {access_token, refresh_token, user{...}}
```

### Efectos secundarios y errores

- **Escribe:** `user_sessions`, `refresh_tokens`, `users` (last_activity_at). En fallo de contraseña intenta `users.failed_attempts` pero se revierte (**FND-A1**).
- **Errores:** 400 (email requerido / captcha / credenciales / 2FA), 401 (inactivo / bloqueado), 429 (rate limit), 500 (BD).
- **Bypass de captcha:** si `RECAPTCHA_SECRET_KEY` no está definida → siempre `true` (por diseño para dev; riesgo en prod mal configurada → Fase 8).

## 2. Refresh y rotación (`POST /api/auth/refresh`)

- `refreshSchema` valida body vacío `.strict()`; el token se lee de `req.cookies.refresh_token` (`auth.controller.ts:95`).
- `authService.refreshToken`: `BEGIN` → `SELECT ... FOR UPDATE` por hash → política de sesión → rotación.

```
token válido no revocado:
  ├─ user activo? token_version de refresh == users.token_version?
  ├─ session: no revoked_at, no expired, idle < SESSION_IDLE_HOURS (def 24h)
  ├─ UPDATE refresh_tokens.revoked=true (token presentado)
  ├─ INSERT nuevo refresh_token (misma family, misma session)
  ├─ UPDATE users.last_activity_at, user_sessions.last_seen_at
  └─ COMMIT → nuevo access_token (sid=session) + nuevo refresh_token

token ya revocado:
  ├─ family + session_id presentes: buscar sibling válido más reciente (family+session, revoked=false)
  │    ├─ si created_at > (now - REUSE_GRACE_SECONDS 30s) y no expiró → BENIGN RACE:
  │    │    rota desde el sibling más fresco (multi-pestaña)
  │    └─ si no → REUSE DETECTION: revokeFamilyForSession (revoca family + session) + COMMIT → null
  └─ controller limpia cookies + 401
```

- **Doble capa de expiración:** el refresh dura 30 días en la fila, pero `SESSION_MAX_DAYS`/`SESSION_IDLE_HOURS`/`REUSE_GRACE_SECONDS` (`auth.service.ts:79-83`, `.env.example:48-55`) gobiernan el ciclo real.
- **Conexión con `authMiddleware`:** cada request protegido re-verifica `revoked_at`/`expires_at` de la sesión (`auth.middleware.ts:78-125`), por lo que un logout revoca el acceso de inmediato sin esperar al TTL de 15 m.

## 3. Logout / Logout-all

- `logout` (`auth.controller.ts:121-133`): toma `refresh_token` de body o cookie, `authService.logout` marca `refresh_tokens.revoked` y `user_sessions.revoked_at`; **siempre** limpia cookies (aunque falle la revocación — anti "phantom login").
- `logoutAll`: `revokeAllUserRefreshTokens` + `revokeAllUserSessions` (`auth.service.ts:667-670`).
- Frontend: `AuthProvider.logout` persiste `auth_logout_pending` en localStorage **antes** de llamar, con 3 reintentos (backoff 400·2^n); al reiniciar, si el flag sigue, fuerza logout (`AuthProvider.tsx:128-145,60-79`).

## 4. 2FA TOTP (enable → verify → login → disable)

```
enable2FA: genera 20 bytes → base32 → otpauth URL; cifra secreto (AES-GCM) y guarda totp_enabled=false
verifyAndEnable2FA: SELECT FOR UPDATE → verifyToken(secret, token) → totp_enabled=true
login: si totp_enabled exige totp_token y lo valida (ventana ±1 paso, 30s, SHA1/6 dígitos)
disable2FA: exige password (bcrypt) + totp_token válido → limpia secreto
```
- `verifyToken` (`auth.service.ts:711-749`): TOTP propio con `crypto.createHmac('sha1')`, comparación `timingSafeEqual`; descifra el secreto si contiene `:`.
- **Frontend:** `frontend/src/modules/2fa/{useTwoFA,two-fa.service,two-fa.types}` + `TwoFAPage`.

## 5. Registro (`POST /api/auth/register`)

- Público; `registerSchema` (email, password, name, rut?, phone?, invite_token?, tenant_id?).
- Rol por defecto `patient` (`auth.service.ts:140`); con `invite_token` adopta email/name/role/specialty/tenant del token (`:144-151`).
- Si invitación de `doctor` con specialty → transacción: INSERT `users` + `doctors` + `doctor_availability` (L-V 09:00-17:00) (`:162-198`).
- RUT validado con `validateRut` (módulo 11 chileno) si se provee.
- **FND-A7:** `tenant_id` viene del body/`req.tenant_id` → verificar aislamiento (Fase 8).

## 6. Password reset

- `forgotPassword`: busca por email+tenant; si existe, genera token (hash HMAC), UPSERT en `password_reset_tokens`, envía email con enlace; **anti-enumeración**: siempre responde igual y añade retardo mínimo de 200ms (`auth.service.ts:874-878`).
- `resetPassword`: valida política inline, `SELECT ... FOR UPDATE`, verifica token no usado/no expirado y `email` coincide, actualiza password + `token_version++`, revoca refresh tokens, marca token usado (`:881-933`).

## 7. `authMiddleware` (verificación por request)

```
extractToken(Bearer | cookie access_token)
 → jwtManager.verify (HS256)
 → tenant check: user.tenant_id === req.tenant_id o role superadmin, si no 401
 → readPool: SELECT users.token_version/active + user_sessions.revoked_at/expires_at (por sid)
    ├─ sin fila → 401 "User no longer exists"
    ├─ active=false → 401
    ├─ token_version distinto → 401 "session invalidated"
    ├─ revoked_at != null → 401 "Session revoked"
    └─ expires_at <= now → 401 "Session expired"
 → req.user = user; setSecurityHeaders(Cache-Control: no-store, ...)
```
