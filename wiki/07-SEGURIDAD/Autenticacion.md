# Autenticación

> JWT, refresh tokens y 2FA.

## Flujo de Tokens

```mermaid
sequenceDiagram
    participant C as Cliente
    participant A as API
    participant DB as PostgreSQL

    C->>A: POST /api/auth/login
    A->>DB: SELECT usuario
    A->>A: bcrypt.compare
    A->>A: Generar access_token (15min) + refresh_token (30d)
    A->>DB: INSERT refresh_token
    A-->>C: { access_token, refresh_token, user }

    Note over C,A: Cuando access_token expira
    C->>A: POST /api/auth/refresh
    A->>DB: Revocar refresh_token anterior
    A->>A: Generar nuevo par
    A->>DB: INSERT nuevo refresh_token
    A-->>C: { access_token, refresh_token }
```

## Access Token

```json
{
  "id": 1,
  "email": "doctor@clinic.com",
  "role": "doctor",
  "tenant_id": "default",
  "iat": 1680000000,
  "exp": 1680000900
}
```

- Algoritmo: HS256
- Expiración: 15 minutos
- Secreto: `JWT_SECRET` (≥ 32 caracteres)

## Refresh Token

- Expiración: 30 días
- Almacenado en tabla `refresh_tokens`
- Rotación: Cada refresh revoca el anterior
- Revocación manual posible

## 2FA (TOTP)

- RFC 6238, paso 30s, tolerancia ±1 paso
- Secreto: 20 bytes aleatorios en base32
- Almacenado cifrado (AES-256-GCM) en `users.totp_secret`
- Compatible con Google Authenticator, Authy

## Política de Contraseñas

| Regla | Valor |
|-------|-------|
| Largo mínimo | 8 caracteres |
| Mayúscula | ≥ 1 |
| Minúscula | ≥ 1 |
| Dígito | ≥ 1 |
| Carácter especial | ≥ 1 |
| Hash | bcrypt 12 rounds |

---

Tags: #seguridad #autenticacion #jwt #2fa
