# SUB-4 — Flujos

## F1. Petición mutante autenticada (camino feliz)

```
[Cliente] --(cookie access_token + cookie csrf_token + header X-CSRF-Token)--> GET/POST
   |
   v
securityMiddleware (helmet/CSP/hpp)               app.ts:122
   |
   v
CORS (allowlist)                                  app.ts:153
   |
   v
cookieParser(COOKIE_SECRET)                       app.ts:181
   |
   v
express.json {limit:100kb}                        app.ts:182
   |
   v
csrfProtection: método seguro? -> next
                : cookie CSRF == header? -> next : 403    csrf.middleware.ts
   |
   v
optionalAuth: firma JWT (sin tocar sesión)        auth.middleware.ts:136
   |
   v
tenantMiddleware (req.tenant_id)                  app.ts:190
   |
   v
globalLimiter (500/15min) -> authLimiter/sessionLimiter según ruta
   |
   v
router: ...authMiddleware (valida token_version/active/revoked/expires)...
        -> authorize(...roles) -> validateZod -> controller -> service
   |
   v
errorHandler (uniforma 4xx/5xx; notifyCritical en 5xx)   errorHandler.middleware.ts
```

## F2. CSRF double-submit

```
1. Primer GET (p.ej. SPA boot) sin cookie csrf_token
   -> csrfProtection genera token = randomBytes(24).hex
   -> res.cookie('csrf_token', token, { httpOnly:false, sameSite:'lax', secure:prod, maxAge:24h })
   -> next()   (sin comprobar método)            [FND-F2]

2. El frontend lee document.cookie -> csrf_token
   y lo replica en header 'X-CSRF-Token' en cada mutación

3. POST con cookie previa:
   csrfProtection compara header X-CSRF-Token === req.cookies.csrf_token
     == -> next
     != -> 403 CSRF token invalid/missing
```

## F3. Validación de entorno y arranque seguro

```
validateEnvSecurity()  (security.middleware.ts:58-121)
   |-- JWT_SECRET ausente/<32/default      -> throw
   |-- COOKIE_SECRET ausente/<32/==JWT     -> throw
   |-- AUDIT_HMAC_SECRET ausente/<32       -> throw
   |-- DATABASE_URL ausente                -> throw
   |-- ENCRYPTION_KEY ausente              -> logger.warn (2FA off)
   |-- RECAPTCHA_SECRET_KEY (solo prod)
   |       ausente -> throw   |   == test-key -> throw
   |       (verificación real en login y /onboard; register no la aplica)   [FND-F1]
   v
app.listen  (o aborta el arranque)
```

## F4. Actividad de sesión

```
trackActivity (tras optionalAuth/tenant)          sessionActivity.middleware.ts
  si req.user y (nunca visto o >5min):
     setImmediate:
        UPDATE users SET last_activity_at = NOW() WHERE id=$1
        si sid!=null: UPDATE user_sessions SET last_seen_at = NOW() WHERE id=$1
  evicción in-memory cada 10min (marca >15min)
```

## F5. Error uniforme

```
throw new AppError(statusCode, code, message)
   v
errorHandler: statusCode = err.statusCode || 500
   5xx -> logger.error + notifyCritical + body 'Internal server error' (prod)
   4xx -> logger.warn + body = err.message
   response: { error, code? }
```
