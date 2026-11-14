# Protección de Datos

> Cifrado, sanitización y headers de seguridad.

## Protección de Datos PHI

Los datos clínicos sensibles (PHI) **no se cifran a nivel de aplicación** (no
existe cifrado de campos en `src/`). Su protección se apoya en capas:

- **Aislamiento por tenant**: Row-Level Security con `ENABLE` + `FORCE` en todas
  las tablas con PHI (`db/security.sql`, `db/migrations/033_rls_hardening.sql`).
- **Cifrado en reposo**: cifrado del volumen/DB de PostgreSQL gestionado (fuera
  de la aplicación).
- **Sanitización**: `sanitize-html` sobre campos clínicos (`sanitizeTextStrict`).
- **Auditoría**: triggers `security_audit` / `phi_audit` + cadena HMAC
  (`AUDIT_HMAC_SECRET`, obligatoria en producción).
- **Límite de escritura**: rate limiting específico para `/clinical-records`.

> La variable `PHI_MASTER_KEY` fue retirada: se declaraba pero no tenía uso en
> `src/`, por lo que daba una falsa sensación de cifrado en la aplicación.

## Sanitización

- `sanitize-html` para campos clínicos (evita XSS)
- Redacción de campos sensibles en logs
- Validación Zod en todas las entradas (body, params, query)

## Headers de Seguridad (Helmet)

| Header | Valor |
|--------|-------|
| Content-Security-Policy | `default-src 'self'` + Google reCAPTCHA + fonts |
| Strict-Transport-Security | `max-age=31536000; includeSubDomains` (HSTS preload) |
| X-Content-Type-Options | `nosniff` |
| X-Frame-Options | `DENY` |
| X-XSS-Protection | `1; mode=block` |

## Otras Protecciones

- **HPP**: Protección contra HTTP Parameter Pollution
- **CORS**: Solo `FRONTEND_URL` + localhost
- **Rate limiting**: 3 niveles (global, auth, PHI)
- **Validation**: Zod 4 en todas las entradas
- **JWT versionado**: Para revocación de tokens

---

Tags: #seguridad #proteccion-datos #cifrado #phi
