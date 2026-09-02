# Servicios Compartidos

> Servicios reutilizables (20) utilizados por todos los módulos.

## Listado Completo

| Archivo | Propósito |
|---------|-----------|
| `db.ts` | Pool PostgreSQL (max 25) + `readPool` opcional; SSL dinámico (interno/externo + `DB_CA_CERT`); setea `app.tenant_id` por sesión; timeouts 30s/60s |
| `jwt.service.ts` | Firma/verificación JWT HS256 (access 15 min, invites 24h) |
| `i18n.service.ts` | Traducciones server-side (es/en completas; pt/fr incompletas) |
| `email.service.ts` | Multi-proveedor: SendGrid > SMTP > log; validación de config al boot |
| `multi-tenant.service.ts` | Caché in-memory de tenants (TTL 5 min), `loadFromDB()` al boot |
| `crypto.service.ts` | AES-256-GCM + PBKDF2 para secrets 2FA; hash SHA256 de tokens |
| `stripe.service.ts` | Cliente Stripe real o stub si no hay `STRIPE_SECRET_KEY` |
| `queue.service.ts` | Cola de jobs sobre tabla `jobs` con retry/backoff (30s/2m/8m) |
| `sessions.service.ts` | Crear/revocar sesiones; token hasheado; TTL 30 días |
| `ownership.ts` | Chequeos BOLA fail-closed médico ↔ paciente (clinical_records / bookings) |
| `booking-utils.ts` | Reglas de agendamiento: feriados, disponibilidad, overlap de slots |
| `booking-history.ts` | `recordBookingStatusChange` (historial de estados) |
| `query.ts` | Helpers de query params + generador seguro de SQL parametrizado multi-tenant |
| `rut.ts` | Validación y formato de RUT chileno |
| `sanitize.ts` | Stripping HTML, `sanitizeText`, `sanitizeTextStrict`, redacción de campos |
| `escape.ts` | Escape de HTML para correos |
| `base32.ts` | Codificación base32 para TOTP |
| `date.ts` | Utilidades de fecha (`getDayOfWeek`, `isValidDate`, `isValidTime`) |
| `seed-status.ts` | Estado de seed compartido (`waitForSeed`) |
| `sentry.service.ts` | `initSentry` + re-export del error handler de Sentry |

## i18n — Backend vs Frontend

| Capa | Locales | Estado |
|------|---------|--------|
| Backend (`i18n.service.ts`) | es, en | ✅ Completo (pt/fr incompletos en server) |
| Frontend (`src/i18n/locales/`) | es, en, pt, fr | ✅ **4 idiomas completos** — 66 namespaces — ~3.500 claves c/u — paridad verificada por test |

---

Tags: #servicios-compartidos #backend #shared