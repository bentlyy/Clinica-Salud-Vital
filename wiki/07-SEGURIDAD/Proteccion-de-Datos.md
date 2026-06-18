# Protección de Datos

> Cifrado, sanitización y headers de seguridad.

## Cifrado de Datos PHI

Los datos clínicos sensibles (PHI) se cifran con AES-256-GCM:

- **Clave maestra**: `PHI_MASTER_KEY` (64 caracteres hex = 32 bytes)
- **Algoritmo**: AES-256-GCM (autenticado)
- **Implementación**: `src/shared/crypto.service.ts`
- **Alcance**: Contenido de registros clínicos, datos personales

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
