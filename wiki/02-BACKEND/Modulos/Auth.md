# Módulo Auth

> Autenticación y autorización de usuarios.

## Ubicación: `src/modules/auth/`

| Archivo | Propósito |
|---------|-----------|
| `auth.controller.ts` | Handlers de rutas de autenticación |
| `auth.service.ts` | Lógica de negocio: registro, login, JWT, 2FA |
| `auth.routes.ts` | Definición de rutas (14 endpoints) |
| `auth.schema.ts` | Validación Zod para inputs de auth |

## Endpoints: `/api/auth`

- `POST /register` — Registro de usuario
- `POST /login` — Login con soporte 2FA
- `POST /refresh` — Rotación de refresh token
- `POST /logout` / `logout-all` — Cierre de sesión
- `POST /change-password` — Cambio de contraseña
- `POST /2fa/enable|verify|disable` — Gestión de 2FA TOTP
- `POST /forgot-password` / `reset-password` — Reset de contraseña
- `GET /.well-known/jwks.json` — Clave pública JWKS

## Seguridad

- JWT HS256 con 15 min de expiración
- Refresh tokens con 30 días y rotación
- bcrypt (12 rounds) para contraseñas
- TOTP (RFC 6238) para 2FA, compatible con Google Authenticator
- Rate limit: 5 intentos por 15 min en login

---

Tags: #modulo #auth #autenticacion
