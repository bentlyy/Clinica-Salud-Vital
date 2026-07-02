# Resumen del Proyecto — Clínica Salud Vital

> **Versión:** 1.0.0 — Producción  
> **Stack:** Node.js 20 + Express 4 + React 19 + Vite 8 + PostgreSQL 15  
> **Patrón:** Monolito modular — 14 módulos en `src/modules/`

---

## Arquitectura General

```
Frontend React :5173  ──/api──►  Express Backend :3000  ──SQL──►  PostgreSQL 15
                                      │
                               SendGrid / SMTP
                               Twilio (SMS/WhatsApp)
                               Stripe (pagos)
                               Sentry (monitoreo)
```

Pipeline de middlewares: Helmet → CORS → Compression → Logger → Rate Limit → Auth JWT → RBAC → Feature Flag → Zod Validation → Handler

---

## Estructura del Backend

**`src/` (~92 archivos)**

| Carpeta | Contenido |
|---------|-----------|
| `modules/` (13 activos + 1 vacío) | `analytics`, `audit`, `auth`, `availability`, `billing`, `booking`, `clinical-record`, `doctor`, `guest`, `laboratory`, `saas`, `specialties`, `super-admin` — y `patient/` vacío |
| `middlewares/` (9) | auth, tenant, security, validate, errorHandler, requestLogger, sessionActivity, feature, asyncHandler |
| `shared/` (17) | db (pg pool), jwt, i18n, email, crypto, stripe, queue, multi-tenant, rut, sanitize, date, etc. |
| `jobs/` (2) | `reminder.job` (cada 5 min), `audit-integrity.job` (cada 6h) |
| `seed/` (2) | `admin.seed.ts` (tenant default + superadmin), `seed.ts` (datos realistas) |

Cada módulo sigue: `*.controller.ts` → `*.service.ts` → `*.routes.ts` → `*.schema.ts` (opcional)

---

## Base de Datos

| Aspecto | Detalle |
|---------|---------|
| Motor | PostgreSQL 15 |
| Driver | `pg` (SQL raw, sin ORM) |
| Tablas | 12+ (init.sql) + migraciones |
| Migraciones | `db/migrations/001_*.sql`, `002_*.sql` |
| Multi-tenancy | Columna `tenant_id` en todas las tablas, filtros automáticos via middleware |

---

## Frontend

- **React 19** + **Vite 8** + **TypeScript**
- 29 páginas con lazy loading
- Tema claro/oscuro (ThemeContext)
- Autenticación via AuthContext (JWT)
- i18n: es/en completos (~478 claves); pt/fr parciales/deprecados
- Gráficos: Recharts 3
- Calendario: FullCalendar 6
- API layer con Axios

---

## Módulos API

| Módulo | Prefijo | Endpoints clave |
|--------|---------|-----------------|
| Auth | `/api/auth` | register, login, refresh, 2FA, change-password, forgot/reset |
| Doctors | `/api/doctors` | CRUD, listar público, invitar, toggle activo |
| Booking | `/api/bookings` | CRUD, available-slots, daily-density, agenda doctor |
| Availability | `/api/availability` | CRUD disponibilidad semanal |
| Exceptions | `/api/exceptions` | CRUD excepciones (full/partial day) |
| Guest | `/api/guest` | Booking sin login por RUT |
| Clinical Records | `/api/clinical-records` | EHR SOAP, recetas, CIE-10, PDF |
| Billing | `/api/billing` | Facturas, pagos, seguros |
| Laboratory | `/api/laboratory` | Tests, solicitudes, resultados |
| Analytics | `/api/analytics` | Dashboard, KPIs, pronóstico demanda |
| Audit | `/api/audit` | Logs de auditoría (admin) |
| Specialties | `/api/specialties` | Catálogo público |
| SaaS | `/api/saas` | Planes, onboarding, Stripe webhook |
| Super Admin | `/api/super-admin` | Tenants, usuarios, estadísticas globales |

---

## Testing

- **Framework:** Vitest 4 con pool forks
- **Tests:** ~1,122 (53 unitarios, 7 integración, 93 archivos)
- **Cobertura:** ~89% líneas (threshold: 50%)
- **Setup:** `tests/setup.js` con mocks de DB, auth, email

---

## Seguridad

| Medida | Detalle |
|--------|---------|
| Helmet | CSP (reCAPTCHA + fonts), HSTS preload, frameguard deny |
| CORS | Solo origen `FRONTEND_URL` |
| Rate limiting | Global (500/15m), Auth (10/15m), PHI (30/15m), Guest (5/h), SaaS (3/h) |
| Validación | Zod 4 en body, params, query |
| JWT | HS256, 15 min exp, versionados para revocación |
| Refresh tokens | 30 días con rotación, almacenados en DB |
| 2FA | TOTP con secreto cifrado AES-256-GCM |
| Auditoría | HMAC-SHA256 encadenado, verificación cada 6h |
| Advisory locks | PostgreSQL para concurrencia en reservas |
| Sentry | Captura errores no manejados |

---

## CI/CD

- **GitHub Actions:** typecheck → test → build → deploy a Render
- **Docker:** `Dockerfile` multi-stage, `docker-compose.yml` para PostgreSQL 15
- **Render:** `render.yaml` con health check post-deploy

---

## Estado Actual

| Aspecto | Estado |
|---------|--------|
| Backend tests | ✅ ~1,122 tests, ~89% cobertura |
| Frontend | ✅ 29 páginas, lazy loading, tema claro/oscuro |
| API | ✅ Documentada |
| CI/CD | ✅ GitHub Actions + Render |
| Seguridad | ✅ Helmet, CORS, rate limiting, Zod, 2FA, auditoría |
| Multi-tenancy | ✅ Implementado con planes SaaS |
| i18n | ⚠️ Solo es/en activos |
| ML | ⬜ Solo en `dist/`, fuente no presente en `src/` |
| Patient module | ⬜ Directorio vacío |

---

## Deuda Técnica

| Item | Prioridad |
|------|-----------|
| Módulo `patient/` vacío | Alta |
| ML solo en `dist/` sin fuente | Media |
| pt/fr i18n incompletos | Baja |
| Sin ORM (SQL raw manual) | Media (intencional) |
| Sin tests de frontend | Media |
| Sin convención de commits | Baja |

---

## Roadmap

**Corto plazo:** Módulo patient, restaurar ML fuente, limpiar i18n, tests frontend, conventional commits  
**Mediano plazo:** Express 5, migraciones automatizadas, rate limiting por tenant  
**Largo plazo:** Microservicio facturación, portal paciente, app mobile, FHIR R4, Stripe real

---

Tags: #resumen #proyecto #indice
