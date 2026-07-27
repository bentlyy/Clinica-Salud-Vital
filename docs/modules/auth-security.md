# Arquitectura de Autenticación y Seguridad

**Versión:** 1.0  
**Fecha:** 2025  
**Módulo:** `src/modules/auth/`, `src/middlewares/`

---

## 1. Flujo de Autenticación

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          Pipeline de Autenticación                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Cliente                    Servidor API                 PostgreSQL          │
│    │                         │                            │                │
│    │  POST /auth/login       │                            │                │
│    │────────────────────────>│                            │                │
│    │                         │    SELECT usuario por email │                │
│    │                         │───────────────────────────>│                │
│    │                         │<───────────────────────────│                │
│    │                         │                            │                │
│    │                         │  ├─ Verificar contraseña   │                │
│    │                         │  ├─ Verificar 2FA (si activo)              │
│    │                         │  └─ Generar tokens        │                │
│    │                         │                            │                │
│    │  { access_token,        │                            │                │
│    │    refresh_token,       │                            │                │
│    │    user }               │                            │                │
│    │<────────────────────────│                            │                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Flujo de tokens

```
Access Token (15 min)          Refresh Token (30 días)
┌─────────────────────┐        ┌──────────────────────────────┐
│ {                   │        │ {                            │
│   id: number,       │        │   id: number,                │
│   email: string,    │        │   jti: string (uuid),        │
│   role: string,     │        │   type: 'refresh'             │
│   rut: string,      │        │ }                            │
│   tenant_id: string,│        │ Almacenado en tabla          │
│   iat/exp           │        │ refresh_tokens con flag      │
│ }                   │        │ de revocación                │
└─────────────────────┘        └──────────────────────────────┘
```

### Rotación de refresh token

Cada llamado a `/auth/refresh`:
1. Valida el refresh token actual
2. Lo revoca en DB (`revoked = true`)
3. Emite nuevo par access + refresh
4. El token anterior queda permanentemente inválido

---

## 2. Autenticación Multifactor (TOTP)

### Flujo

1. **Activar:** `POST /auth/2fa/enable` → genera secreto base32 → retorna URI QR
2. **Verificar:** `POST /auth/2fa/verify` → valida código TOTP actual → activa 2FA
3. **Login:** Si `totp_enabled`, el login requiere campo `totp_token`
4. **Desactivar:** `POST /auth/2fa/disable` → elimina secreto + desactiva

### Implementación

- Algoritmo: TOTP (RFC 6238)
- Paso de tiempo: 30 segundos
- Tolerancia: ±1 paso (permite desfase de reloj)
- Secreto: 20 bytes aleatorios codificados en base32
- Compatible con Google Authenticator, Authy

### Tabla

```sql
ALTER TABLE users ADD COLUMN totp_secret VARCHAR(64);
ALTER TABLE users ADD COLUMN totp_enabled BOOLEAN DEFAULT FALSE;
```

---

## 3. Política de Contraseñas

### Requisitos (validación Zod)

| Regla | Valor |
|-------|-------|
| Largo mínimo | 8 caracteres |
| Mayúscula | ≥ 1 |
| Minúscula | ≥ 1 |
| Dígito | ≥ 1 |
| Carácter especial | ≥ 1 |
| Rondas de hash | bcrypt 12 |
| Cambio en primer login | Flag `password_changed` |

### Flujo de cambio de contraseña

```
POST /auth/change-password
  Body: { currentPassword, newPassword }
  Efecto secundario: revoca TODOS los refresh tokens del usuario
```

---

## 4. Arquitectura de Autorización

### Jerarquía de roles

```
superadmin → admin → doctor → patient/user
```

### Pipeline de middlewares

```
Petición → authMiddleware → authorizeRoles() → requireFeature()
```

| Middleware | Propósito |
|------------|-----------|
| `authMiddleware` | Verifica JWT → inyecta `req.user` |
| `optionalAuth` | Igual pero no falla si no hay token |
| `authorizeRoles('admin', 'doctor')` | Verifica rol |
| `requireFeature('ml')` | Gating de funcionalidades (plan SaaS) |
| `requireLimit('doctors')` | Verifica límites del plan |

### Middleware de auditoría

Todas las operaciones CUD en entidades críticas (reservas, registros clínicos, usuarios) se registran con:
- Valores viejos (antes del cambio)
- Valores nuevos (después del cambio)
- Dirección IP + user agent
- ID del usuario que realizó la acción

---

## 5. Pipeline de Middlewares de Seguridad

```
1. Helmet                    → CSP, HSTS (1 año), XSS Filter, noSniff, Frameguard(deny)
2. HPP                       → Protección contra contaminación de parámetros HTTP
3. CORS                      → Lista blanca: localhost:5173 + FRONTEND_URL
4. Compression               → Respuestas gzip
5. Request Logger            → Winston con duración
6. Rate Limit Global         → 500 peticiones / 15 min (salta /health)
7. Rate Limit Auth           → 5 intentos / 15 min (solo login)
8. JSON Body Parser          → límite: 100kb
```

### Configuración CORS

```typescript
const allowedOrigins = [
  'http://localhost:5173',
  process.env.FRONTEND_URL,
  process.env.RENDER_EXTERNAL_URL,
].filter(Boolean);
```

### Niveles de rate limiting

| Nivel | Ventana | Máx | Aplica a |
|-------|---------|-----|----------|
| Global | 15 min | 500 | Todas las rutas (excepto /health) |
| Auth | 15 min | 5 | Login, register |
| ML train | 60 min | 5 | Entrenamiento de modelos |
| ML predict | 1 min | 30 | Endpoints de predicción |
| RUT check | 15 min | 10 | Búsqueda de RUT invitado |

---

## 6. Configuración JWT

| Parámetro | Valor |
|-----------|-------|
| Algoritmo | HS256 |
| Secreto | Configurable vía `JWT_SECRET` (≥ 32 caracteres, validado al inicio) |
| Access token | 15 min |
| Refresh token | 30 días |
| Payload | `{ id, email, role, rut, tenant_id }` |

---

## 7. Seguridad de Webhooks

Los webhooks salientes incluyen:
- `X-Webhook-Signature`: HMAC-SHA256 del cuerpo de la petición
- `X-Webhook-Event`: nombre del tipo de evento
- Secreto auto-generado (32 bytes hex) por webhook

---

## 8. Headers de Seguridad (Helmet)

| Header | Valor |
|--------|-------|
| Content-Security-Policy | `default-src 'self'` |
| Strict-Transport-Security | `max-age=31536000; includeSubDomains` |
| X-XSS-Protection | `1; mode=block` |
| X-Content-Type-Options | `nosniff` |
| X-Frame-Options | `DENY` |

---

## 9. Validación de Entorno

Al iniciar, `validateEnvSecurity()` verifica:
- `JWT_SECRET` está definido y tiene ≥ 32 caracteres
- `DATABASE_URL` está definida
- En producción: `FRONTEND_URL` está definida

---

## Relacionados

- ADR-001: Monolito Modular (pipeline de middlewares)
- Documentos de performance: `/docs/performance/monitoring-setup.md`
- Runbook: Respuesta a incidentes de autenticación
