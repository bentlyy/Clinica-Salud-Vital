# Servicios Compartidos

> Servicios reutilizables utilizados por todos los módulos.

## Listado Completo

| Archivo | Propósito |
|---------|-----------|
| `db.ts` | Pool PostgreSQL (single instance, configuración desde `DATABASE_URL`) |
| `jwt.service.ts` | Getter del secreto JWT (validación de longitud ≥ 32) |
| `i18n.service.ts` | Traducciones multi-idioma (es/en activos) |
| `email.service.ts` | Transporte Nodemailer (SendGrid + Gmail SMTP fallback) |
| `multi-tenant.service.ts` | Carga y refresh de tenants cada 5 min |
| `crypto.service.ts` | Cifrado AES-256-GCM para datos PHI |
| `stripe.service.ts` | Wrapper de Stripe (modo simulado sin API key) |
| `queue.service.ts` | Cola de notificaciones (procesamiento batch) |
| `booking-utils.ts` | Validación de slots compartida |
| `query.ts` | Helpers `getQueryInt()`, `getQueryStr()` |
| `rut.ts` | Validación y formato de RUT chileno |
| `sanitize.ts` | Sanitización de campos HTML |
| `escape.ts` | Escape de strings para SQL/HTML |
| `base32.ts` | Codificación base32 para TOTP |
| `date.ts` | Utilidades de fecha |
| `seed-status.ts` | Estado de seed para el frontend |
| `sentry.service.ts` | Inicialización de Sentry |

## i18n

| Locale | Estado | Claves |
|--------|--------|--------|
| es | ✅ Completo | ~478 |
| en | ✅ Completo | ~478 |
| pt | ❌ Deprecado | ~106 |
| fr | ❌ No existe (copia falsa de es) |

---

Tags: #servicios-compartidos #backend #shared
