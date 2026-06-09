# Seguridad

## Capas

| Capa | Implementación |
|------|---------------|
| Helmet | CSP, HSTS (1y), XSS Filter, noSniff, Frameguard deny |
| HPP | HTTP Parameter Pollution |
| CORS | Whitelist localhost:5173 + FRONTEND_URL |
| Rate Limit | Global 500/15min, Auth 30/15min, RUT 10/15min |
| Body | JSON limit 100kb |
| Passwords | bcrypt 12 rounds |
| JWT | Secret ≥ 32 chars validado al startup |
| Validation | Zod strict schemas en todos los endpoints |
| Role | Middleware `authorizeRoles('admin', 'doctor')` |
| Audit | Logging de cambios a entidades críticas |
| Error | Sin stack trace en producción |

## Auth Flow
1. Login → JWT access (15min) + refresh (30d)
2. Refresh token rotation (cada refresh revoca anterior)
3. 2FA opcional via TOTP (Google Authenticator)
4. Password policy: 8+ chars, mayúscula, minúscula, número, especial

## Multi-tenancy
- `tenant_id` en JWT + header/subdominio
- Aislamiento por `WHERE tenant_id = ?`
- Super admin con acceso global
