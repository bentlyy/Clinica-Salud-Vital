# Auth

## Endpoints
- `POST /auth/register` — Registro con nombre
- `POST /auth/login` — Login (devuelve `access_token`, `refresh_token`, `user`)
- `POST /auth/refresh` — Refresh token rotation
- `POST /auth/logout` — Revoca refresh token
- `POST /auth/logout-all` — Revoca todos
- `POST /auth/change-password` — Cambio con política de seguridad
- `POST /auth/2fa/enable` — Genera secreto TOTP
- `POST /auth/2fa/verify` — Activa 2FA
- `POST /auth/2fa/disable` — Desactiva 2FA

## Features
- **JWT** con `{ id, email, role, rut, tenant_id }`, expira 15 min
- **Refresh tokens** en tabla `refresh_tokens`, expiran 30 días
- **2FA/TOTP** compatible con Google Authenticator (ventana 30s, ±1 step)
- **Password policy**: 8+ chars, mayúscula, minúscula, número, especial
- **reCAPTCHA v2** en login
- `password_changed` flag para forzar cambio en primer login

## Flujo Login
1. POST `/auth/login` → `{ access_token, refresh_token, user }`
2. Si user tiene `totp_enabled`, requiere `totp_token` extra
3. Access token en header `Authorization: Bearer`
4. Al 401, frontend usa `/auth/refresh` automáticamente
