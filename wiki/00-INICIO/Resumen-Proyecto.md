# Resumen del Proyecto — Vitaria

> **Versión:** 1.0.0 — Producción
> **Stack:** Node.js 20 + Express 4 + React 19 + Vite 6 + PostgreSQL 15
> **Patrón:** Monolito modular — 23 módulos en `src/modules/` + frontend por módulos

---

## Arquitectura General

```
Frontend React :5173  ──/api──►  Express Backend :3000  ──SQL──►  PostgreSQL 15 (RLS)
                                      │
                               SendGrid / SMTP · Twilio · Stripe (stub) · Sentry
```

Pipeline de middlewares: Security (Helmet+HPP) → Compression → Health → CORS → Cookie/JSON → CSRF → Auth → Tenant (RLS) → Activity → CorrelationId → Logger → Rate Limit → Routers → Error Handler

---

## Estructura del Backend

**`src/` (140 archivos `.ts`)**

| Carpeta | Contenido |
|---------|-----------|
| `modules/` (23) | `analytics`, `attachments`, `audit`, `auth`, `availability`, `billing`, `booking`, `calendar`, `clinical-record`, `clinical-templates`, `data-portability`, `doctor`, `guest`, `holidays`, `laboratory`, `medical-history`, `notifications`, `reports`, `saas`, `specialties`, `super-admin`, `waitlist`, `webhooks` |
| `middlewares/` (11) | auth, tenant, security, validate, errorHandler, requestLogger, sessionActivity, feature, asyncHandler, csrf, correlationId |
| `shared/` (20) | db (pg pool), jwt, i18n, email, crypto, stripe, queue (tabla jobs), multi-tenant, rut, sanitize, ownership, sessions, booking-utils, booking-history, query, escape, date, base32, seed-status, sentry |
| `jobs/` (2) | `reminder.job` (recordatorios 1h/24h), `audit-integrity.job` (verificación HMAC cada 6h) |
| `seed/` (2) | `admin.seed.ts` (tenant default + superadmin + admins), `seed.ts` (datos realistas + backfills) |
| `utils/` (3) | `logger.ts` (Winston), `errors.ts` (jerarquía AppError), `error-codes.ts` (catálogo central) |

Cada módulo sigue: `*.controller.ts` → `*.service.ts` → `*.routes.ts` → `*.schema.ts` (opcional)

---

## Base de Datos

| Aspecto | Detalle |
|---------|---------|
| Motor | PostgreSQL 15 |
| Driver | `pg` (SQL raw, sin ORM) |
| Tablas | **47** (init.sql consolidado) |
| Migraciones | **23** (`db/migrations/001_*` … `023_*`, tracking `_migrations`) |
| Multi-tenancy | `tenant_id` en todas las tablas + **RLS FORCE** por sesión (`app.tenant_id`) |
| Seguridad | `audit_logs` HMAC encadenado, secrets 2FA AES-256-GCM, bcrypt 12, CHECK constraints |

---

## Frontend

- **React 19** + **Vite 6** + **TypeScript 5.7** (`strict: true`)
- **MUI 6** + TanStack Query/Table + Recharts 2 + FullCalendar 6 + framer-motion + react-hook-form
- **53 páginas** con lazy loading total + **18 componentes compartidos**
- **431 archivos** en `frontend/src/`
- Tema claro/oscuro (AppThemeProvider)
- Autenticación via AuthProvider (JWT) + FeatureProvider (feature flags SaaS)
- **i18n: 4 idiomas completos** (es/en/pt/fr) — 66 namespaces — ~3.500 claves c/u, paridad verificada
- API layer central: `shared/services/api-client.ts` + 24 services

---

## Módulos API

| Módulo | Prefijo | Endpoints clave |
|--------|---------|-----------------|
| Auth | `/api/auth` | register, login, refresh, 2FA, sessions, change-password, forgot/reset (17) |
| Doctors | `/api/doctors` | CRUD, público, invitar, toggle activo |
| Booking | `/api/bookings` | CRUD, available-slots, daily-density, series |
| Availability | `/api/availability` (+ `/api/availability-exceptions`) | Bloques semanales + excepciones |
| Guest | `/api/guest` | Booking sin login por RUT |
| Clinical Records | `/api/clinical-records` | EHR SOAP, recetas, CIE-10, PDF |
| Clinical Templates | `/api/clinical-templates` | Plantillas clínicas |
| Medical History | `/api/medical-history` | Historial médico del paciente |
| Calendar | `/api/calendar` | Exportación ICS |
| Billing | `/api/billing` | Facturas, pagos, seguros |
| Laboratory | `/api/laboratory` | Tests, solicitudes, resultados, QC, muestras (46) |
| Analytics | `/api/analytics` | Dashboard, KPIs, demanda (SMA), vitals |
| Reports | `/api/reports` | Reportes + PDF |
| Notifications | `/api/notifications` | Notificaciones in-app |
| Waitlist | `/api/waitlist` | Lista de espera |
| Holidays | `/api/holidays` | Feriados de clínica |
| Attachments | `/api/attachments` | Adjuntos |
| Data Portability | `/api/export` | Exportar historia del paciente |
| Webhooks | `/api/webhooks` | Suscripciones y entregas |
| Audit | `/api/audit` | Logs de auditoría (admin) |
| Specialties | `/api/specialties` | Catálogo público |
| SaaS | `/api/saas` | Planes, onboarding, webhook Stripe |
| Super Admin | `/api/super-admin` | Tenants, usuarios, estadísticas globales (22) |

Total: **~204 endpoints** (202 routers + 2 health)

---

## Testing

- **Framework:** Vitest (backend 4, frontend 3) — backend con pool forks, frontend con jsdom
- **Backend:** ~111 archivos (~102 unit + 9 integración Supertest), ~1.5k casos, ~89% líneas
- **Frontend:** 178 archivos de test, ~1.2k casos, ~84% líneas
- **Cobertura límites:** backend 85/80/85/85 · frontend 80/70/70/80 (lines/branches/functions/statements)
- **Setup:** `tests/setup.js` (mocks de DB, auth, email, fetch) · `frontend/src/test/setup.ts`

---

## Seguridad

| Medida | Detalle |
|--------|---------|
| Helmet | CSP, HSTS, frameguard deny + HPP + Permissions-Policy |
| CORS | whitelist localhost:5173 + FRONTEND_URL + RENDER_EXTERNAL_URL |
| Rate limiting | Global (500/15m), Auth (10/15m), PHI (30/15m), Guest (5/h), RUT (3/15m), SaaS (3/h) |
| Validación | Zod 4 backend / zod 3 frontend (body, params, query) |
| JWT | HS256, 15 min exp, versión de token para revocación |
| Refresh tokens | 30 días con rotación, almacenados en DB |
| 2FA | TOTP con secreto cifrado AES-256-GCM |
| Sesiones | Tabla `user_sessions`, revocables, timeout de inactividad |
| Auditoría | HMAC-SHA256 encadenado, verificación cada 6h |
| Multi-tenant | RLS FORCE + BOLA checks (`ownership.ts`) |
| CSRF | Double-submit cookie + header `X-CSRF-Token` |
| Sentry | Captura errores no manejados (opcional) |

---

## CI/CD

- **GitHub Actions:** `npm audit` → typecheck → test (coverage) → build (backend + frontend)
- **Docker:** `Dockerfile` multi-stage (node:20-alpine, non-root), `docker-compose.yml` + `docker-compose.prod.yml`
- **Render:** `render.yaml` con health check `/health`; frontend estático con rewrite SPA

---

## Estado Actual

| Aspecto | Estado |
|---------|--------|
| Backend tests | ✅ ~1.5k tests, ~89% cobertura |
| Frontend | ✅ 53 páginas, ~1.2k tests, TS strict, lazy loading |
| API | ✅ ~204 endpoints |
| CI/CD | ✅ GitHub Actions (audit + typecheck + test + build) + Render |
| Seguridad | ✅ Helmet, CORS, rate limiting, Zod, 2FA, auditoría, RLS, BOLA |
| Multi-tenancy | ✅ Implementado con planes SaaS auto-gestionables |
| i18n | ✅ 4 idiomas completos con paridad |
| ML | ⬜ Stub — `smaForecast()` (media móvil), sin TF.js |
| Patient module | ✅ Portal paciente funcional |

---

## Deuda Técnica

| Item | Prioridad |
|------|-----------|
| Seed/backfills en cada startup | Media |
| Tests backend en JS (no TS) | Media |
| @types en dependencies | Media |
| CI sin lint / sin coverage upload | Media |
| frontend-v3/ residual | Baja |

---

## Roadmap

**Corto plazo:** depurar seed en producción, lint (ESLint), tests backend en TS, limpiar `frontend-v3/`
**Mediano plazo:** Express 5, migraciones versionadas robustas, rate limiting por tenant, coverage upload
**Largo plazo:** portal de autoservicio avanzado, app mobile, FHIR R4, Stripe real

---

Tags: #resumen #proyecto #indice