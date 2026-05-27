# AI Agent Instructions — Clinic Backend

## Project Overview
Full-stack clinical management system (Node.js + Express 5 + React + Vite + PostgreSQL 15).
Desplegado en Render. ML con TensorFlow.js.

### Ports
| Servicio | Puerto |
|----------|--------|
| API | 3000 |
| Frontend | 5173 |
| PostgreSQL | 5432 |

---

## Stack & Packages

### Backend
| Package | Uso |
|---------|-----|
| express 5 | Framework HTTP |
| pg | PostgreSQL pool |
| jsonwebtoken | JWT auth + confirm tokens |
| bcrypt | Password hashing (12 rounds) |
| zod 4.x | Input validation |
| winston | Logging (info/warn/error) |
| helmet + hpp | Security headers |
| express-rate-limit | Rate limiting |
| nodemailer | Email (Gmail SMTP) |
| pdfkit | Receta PDF |
| node-cron | Cron jobs (c/5 min) |
| compression | Gzip responses |
| @tensorflow/tfjs | ML models (no-show, diagnosis, demand, vitals) |

### Frontend
| Package | Uso |
|---------|-----|
| React 19 | UI framework |
| Vite 6 | Build tool |
| MUI | Component library |
| FullCalendar | Doctor calendar |
| Recharts | Analytics charts |

---

## Running the Project

### Local Development
```bash
# Start PostgreSQL
docker compose up -d db

# Start API
npm install
npm run dev
```

### Deploy to Render
```bash
# Push to GitHub and create a Render Web Service:
# Build Command: npm install && npm run build
# Start Command: npm start
```

### Commands
| Cmd | Desc |
|-----|------|
| `npm run dev` | Dev server (tsx watch) |
| `npm start` | Production (node dist/app.js) |
| `npm test` | Tests + coverage |
| `npm run test:watch` | Watch mode |
| `npm run typecheck` | TypeScript check |
| `npm run build` | Compile TS + build frontend |
| `npm run build:backend` | Compile TS only (tsc) |
| `npm run build:frontend` | Build frontend only (Vite) |

---

## Project Structure

```
src/
├── app.ts                    # Entry point (Express setup, routes, migrations, cron)
├── middlewares/               # Pipeline: security → cors → compression → logger → rateLimit → auth → role → validate → audit
│   ├── auth.middleware.ts     # JWT verify (injects req.user)
│   ├── role.middleware.ts     # Role check (admin/doctor/user)
│   ├── security.middleware.ts # Helmet + HPP + env validation
│   ├── validate.middleware.ts # Zod body/params/query validation
│   ├── errorHandler.ts       # Global error handler (stack dev-only)
│   ├── requestLogger.ts      # Winston request logging
│   └── asyncHandler.ts       # Async error wrapper
├── modules/                   # 14 modules (monolito modular)
│   ├── auth/                  # POST /register, /login
│   ├── booking/               # CRUD bookings, slots, doctor agenda
│   ├── doctor/                # Register, create, profile
│   ├── availability/          # Weekly blocks (day_of_week)
│   ├── exception/             # Full/partial day blocks
│   ├── guest/                 # Guest bookings + RUT lookup
│   ├── confirmation/          # Email token confirmation
│   ├── clinical-record/       # EHR + prescriptions + CIE-10 + PDF
│   ├── analytics/             # Dashboard + stats + ML integration
│   ├── billing/               # Invoices + payments + insurance
│   ├── laboratory/            # Lab tests + requests + results
│   ├── audit/                 # Audit logs (admin only)
│   ├── rbac/                  # Permissions query
│   └── ml/                    # TF.js: train, predict, forecast, cache
├── shared/                    # db.ts, jwt.ts, rut.ts, email.ts, date.ts, query.ts
├── utils/                     # logger.ts, errors.ts (AppError classes)
├── jobs/                      # reminder.job.ts, confirmation.job.ts
└── seed/                      # admin.seed.ts, seed.ts
```

---

## API Conventions

### Paginated responses
All list endpoints return `{ data: [...], pagination: { page, limit, total, totalPages } }`.
Frontend must extract `.data` — **not the raw response**.

### Auth
- Header: `Authorization: Bearer <token>`
- Token JWT con `{ id, email, role, rut }`, expires 1d
- `req.user` disponible en rutas autenticadas (type: `AuthRequest`)

### Error format
```json
{ "error": "message", "details": ["field: detail"], "stack": "..." }
```
Stack solo en desarrollo.

### Validation
Zod schemas en `*.schema.ts`. Middleware `validateZod(schema, 'body'|'params'|'query')`.

---

## Security

| Layer | Detail |
|-------|--------|
| Helmet | CSP, HSTS (1y), XSS Filter, noSniff, Frameguard deny |
| HPP | HTTP Parameter Pollution prevention |
| CORS | Whitelist: localhost:5173 + FRONTEND_URL |
| Rate Limit | Global 100/15min, Auth 10/15min, RUT 10/15min |
| Body | JSON limit 10kb |
| Passwords | bcrypt 12 rounds |
| JWT | Secret configurable, validated ≥ 32 chars at startup |
| Validation | Zod strict schemas on all endpoints |
| Role | Middleware: `authorizeRoles('admin', 'doctor')` |
| Audit | Middleware logs changes to critical entities |
| Error handler | Never leaks stack in production |
| Race conditions | PostgreSQL advisory locks on booking creation |

---

## Module Patterns

Every module follows this convention:
```
module/
├── module.controller.ts   # Express handlers (asyncHandler wrapper)
├── module.service.ts      # Business logic + DB queries
├── module.routes.ts       # Router definition
├── module.schema.ts       # Zod validation schemas
└── (optional extras)
    ├── module.email.ts    # Email templates
    ├── module.middleware.ts
    └── ...
```

Controllers use `asyncHandler` from `middlewares/asyncHandler.middleware.ts` to catch async errors.

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `src/app.ts` | Express bootstrap, migration runner, cron starter |
| `src/shared/db.ts` | PostgreSQL pool (single instance) |
| `src/shared/jwt.ts` | JWT secret getter |
| `src/shared/rut.ts` | RUT validation (Chilean) + format/clean |
| `src/shared/email.service.ts` | Nodemailer transport |
| `src/shared/date.ts` | getDayOfWeek, isValidDate, isValidTime |
| `src/shared/query.ts` | getQueryInt, getQueryString helpers |
| `src/utils/errors.ts` | AppError classes (BadRequestError, NotFoundError, UnauthorizedError) |
| `src/utils/logger.ts` | Winston logger (console + file rotation) |
| `src/middlewares/auth.middleware.ts` | JWT verification + authorize() |
| `src/middlewares/role.middleware.ts` | authorizeRoles() |
| `src/middlewares/security.middleware.ts` | Helmet + HPP + env validation |
| `src/middlewares/errorHandler.middleware.ts` | Global error + 404 handler |
| `src/middlewares/validate.middleware.ts` | Zod validation middleware |
| `src/middlewares/asyncHandler.middleware.ts` | Async error wrapper |
| `src/middlewares/requestLogger.middleware.ts` | Request logging with duration |
| `src/modules/audit/audit.middleware.ts` | Audit logging middleware |
| `src/shared/i18n.service.ts` | Backend i18n service (421+ keys × 4 locales) |
| `src/modules/i18n/` | Exposes translations via `GET /api/v1/i18n/translations` |
| `db/init.sql` | Full schema + seed (migrations runner applies migration files too) |

---

## Frontend Key Files

| File | Purpose |
|------|---------|
| `frontend/src/context/AuthContext.jsx` | Auth state: user, token, loading, login/logout |
| `frontend/src/context/useAuth.js` | Hook wrapper (fixes fast-refresh HMR) |
| `frontend/src/pages/BookingPage.jsx` | Booking flow (user=createBooking, guest=createGuestBooking) |
| `frontend/src/pages/DoctorPanel.jsx` | Doctor dashboard (agenda + availability + exceptions) |
| `frontend/src/pages/MyBookingsPage.jsx` | Patient bookings list |
| `frontend/src/pages/AnalyticsPage.jsx` | Admin analytics dashboard |
| `frontend/src/i18n/useI18n.js` | I18n hook + I18nContext + I18nProvider — API fetch + localStorage cache + custom event |
| `frontend/src/i18n/translations.js` | Embedded fallback translations (~421 keys × 4 locales, 18 prefix groups) |

### AuthContext behavior
- `loading` starts `true`
- `useEffect` loads from localStorage on mount → sets `false`
- Login stores token + user in localStorage
- Logout clears localStorage

---

## Database Notes

- All migrations consolidated in `db/init.sql` (434 lines)
- Additional migrations in `db/migrations/` applied via migration runner (tracks applied in `_migrations` table)
- Database URL: `postgresql://postgres:postgres@localhost:5432/clinic` (local) or your Render PostgreSQL URL
- Connection pool via `pg` in `src/shared/db.ts`
- 15+ tables: users, doctors, bookings, availability, exceptions, clinical_records, prescriptions, cie10_catalog, audit_logs, invoices, invoice_items, payments, insurance_claims, lab_tests, lab_requests, lab_request_items, permissions, role_permissions, user_permissions, ml_prediction_history, ml_model_metrics, ml_demand_forecast
- 30+ indexes including partial and functional
- 4 triggers for updated_at
- Constraints: CHECK for guest_or_user, slot_duration, future_date, etc.

---

## Seed Users

| Rol | Email | Password | RUT |
|-----|-------|----------|-----|
| Admin | admin@clinic.com | REPLACED_PASSWORD | 20.287.886-5 |
| Doctor | juan@clinic.com | REPLACED_PASSWORD | 11.222.333-9 |
| Doctor | maria@clinic.com | REPLACED_PASSWORD | 14.333.444-7 |
| Doctor | carlos@clinic.com | REPLACED_PASSWORD | 13.444.555-5 |
| Doctor | ana@clinic.com | REPLACED_PASSWORD | 12.555.666-3 |
| Patient | user1@clinic.com | REPLACED_PASSWORD | 15.666.777-3 |
| Patient | user2@clinic.com | REPLACED_PASSWORD | 16.777.888-1 |
| Patient | user3@clinic.com | REPLACED_PASSWORD | 17.888.999-9 |

---

## ML Module (TensorFlow.js)

4 models:
- **noShowModel**: Predicts no-show probability (doctorId, userId, date, time, bookingId)
- **diagnosisModel**: Classifies diagnosis from chief complaint text
- **demandModel**: Forecasts daily appointment demand
- **vitalAnomalyModel**: Detects anomalies in vital signs

Features:
- LRU cache for predictions (`ml.cache.ts`)
- Metrics middleware tracks prediction counts and latency
- Input sanitization + validation (`ml.validator.ts`)
- Training uses `trainAllModels()` on historical data
- Results stored in `ml_prediction_history`, `ml_model_metrics`, `ml_demand_forecast`

---

## Testing

| Type | Files | What |
|------|-------|------|
| Unit | 13 | auth, booking, doctor, guest, confirmation, exception, RUT, laboratory, billing, i18n, routes, ml service, shared utilities |
| Integration | 7 | auth, booking, doctor, guest-confirmation, analytics, audit, clinical-record |
| ML | 1 | ML model tests |

**Setup:** `tests/setup.js` mocks env vars. DB mocked via `vi.hoisted()` over `pool.query`.
**Coverage threshold:** 50% lines/branches/functions/statements (Vitest + v8).

### Coverage actual

| Métrica | % |
|---------|---|
| Statements | 88.9 |

| Branches | 88.56 |

| Functions | 92.04 |

| Lines | 89.1 |

**1121 tests** · 93 archivos · 0 fallos

---

## 🆕 Nuevas Funcionalidades (v2)

### API Versioning
- Todas las rutas ahora bajo `/api/v1/`
- Backward compatibilidad mantenida con `/api/` → redirige a `/api/v1/`
- Frontend configurado con `VITE_API_URL=/api/v1`

### Refresh Tokens
- `POST /api/v1/auth/refresh` — intercambia refresh token por nuevo access+refresh
- `POST /api/v1/auth/logout` — revoca refresh token
- `POST /api/v1/auth/logout-all` — revoca todos los refresh tokens del usuario
- Access token expira en 15min, refresh token en 30 días
- Frontend interceptor renueva automáticamente en 401/TOKEN_EXPIRED
- Tabla `refresh_tokens` con tracking de revocación

### 2FA / MFA (TOTP)
- `POST /api/v1/auth/2fa/enable` — genera secreto TOTP
- `POST /api/v1/auth/2fa/verify` — verifica código y activa 2FA
- `POST /api/v1/auth/2fa/disable` — desactiva 2FA
- Login requiere `totp_token` extra si el usuario tiene 2FA habilitado
- Columnas `totp_secret` y `totp_enabled` en tabla `users`
- Compatible con Google Authenticator / Authy

### Cambio de Contraseña con Políticas
- `POST /api/v1/auth/change-password`
- Política: min 8 chars, mayúscula, minúscula, número, especial
- Columna `password_changed` en `users` (para forzar cambio en primer login)
- Al cambiar contraseña se revocan todos los refresh tokens

### Webhooks
- Módulo completo bajo `/api/v1/webhooks` (admin-only)
- CRUD de webhooks con eventos y secret HMAC
- Tabla `webhook_deliveries` con historial de entregas
- Función `dispatchEvent(event, payload)` lista para integrar en cualquier módulo
- Headers: `X-Webhook-Signature` (HMAC-SHA256), `X-Webhook-Event`

### SMS / WhatsApp
- Servicio `sms.service.ts` con soporte Twilio (SMS y WhatsApp)
- Modo `log` para desarrollo (solo imprime en consola)
- Servicio unificado `notification.service.ts` multicanal (email + sms)
- Configurable via `SMS_PROVIDER=log|twilio|whatsapp`

### Multi-tenancy
- Middleware `tenant.middleware.ts` inyecta `req.tenant_id` y `req.locale`
- Soporte por subdominio (`clinica1.misistema.com`) o header `X-Tenant-Id`
- Tabla `tenants` con configuración por tenant (locale, timezone)
- Columna `tenant_id` en tabla `users`
- Tabla `notification_preferences` por usuario

### Internacionalización (i18n)
- Servicio `i18n.service.ts` con 4 idiomas: es, en, pt, fr
- **421+ claves** traducidas en todos los idiomas, 0 duplicados
- `t(key)` devuelve en locale actual, `tAll(key)` devuelve en todos
- Frontend: `useI18n` hook + `I18nContext` + `I18nProvider` — fetch API con cache localStorage
- **14+ páginas migradas**: todas las páginas públicas y privadas usan `t()` sin texto hardcodeado
- Locale reactivo vía custom event (`locale:changed`) — sin recarga de página
- `ErrorBoundary` usa `I18nContext` (class component)
- Fallback automático a español si falta clave en locale actual
- Configurable via `APP_LOCALE=es|en|pt|fr`

### Seguridad Mejorada
- Body limit: 10kb → 100kb (permite EHRs y recetas completas)
- Rate limits: global 100→500/15min, auth 10→30/15min
- Password complexity validada en backend (Zod) y frontend
- Refresh token rotation (cada refresh revoca el anterior)
- `optionalAuth` middleware para rutas públicas opcionalmente autenticadas

## Test Gotchas

### vi.mock paths (ml.service.test.js)
- When mocking modules that are imported via relative paths in source files, use the path **relative to the test file**, not the source file.
- `vi.mock('./ml.cache.js', ...)` resolves relative to `tests/unit/` → `tests/unit/ml.cache.js` (wrong!)
- Must use `vi.mock('../../src/modules/ml/ml.cache.js', ...)` to resolve to `src/modules/ml/ml.cache.js` (correct)
- Same applies to `ml.middleware.js` and any other module imported by the source via a relative path.

## Known Issues & Gotchas

- TypeScript files in `src/utils/` are `.ts` but imported as `.js` (works with tsx/vitest)
- AuthContext `loading` starts as `true` (not false) — components must handle loading state
- `frontend/src/context/useAuth.js` exists to fix React fast-refresh (HMR) — import from there, not AuthContext directly
- API returns paginated `{ data, pagination }` — frontend must extract `.data` for `.map()`
- Guest RUT search cleans formatting and searches both `guest_rut` AND `users.rut`
- Login now returns `access_token`, `refresh_token` and `user` (not just `token`)
- Login response includes `password_changed` and `totp_enabled` flags in user object
- `VITE_API_PROXY_TARGET=http://localhost:3000` in dev — proxy de Vite al backend
- `db/migrations/` files applied incrementally via `_migrations` tracking table
- When creating a doctor, always creates default availability (Mon-Fri 09:00-17:00)
- Billing invoice number format: `INV-YYYY-XXXXX`
- ML models disposed on reset — cache cleared from LRU
- Twilio SDK is optional — SMS works in `log` mode without it
- API versioning: new routes under `/api/v1/`, old `/api/` still works
- Webhook secrets auto-generated (32 bytes hex) if not provided
- 2FA uses TOTP with 30s window and ±1 step tolerance

---

## 🆕 SAAS Multi-Tenant (v3)

### Arquitectura
- **Shared database** con `tenant_id` en TODAS las tablas (migración `010_saas_multitenant.sql`)
- Los tenants se cargan desde DB al startup (`tenantService.loadFromDB()`) y se refrescan cada 5 min
- JWT incluye `tenant_id` para identificación sin DB lookup
- Aislamiento de datos por `WHERE tenant_id = ?` en todas las queries

### Planes y Suscripciones
| Plan | Código | Precio | Doctores | Pacientes |
|------|--------|--------|----------|-----------|
| Gratuito | free | $0 | 1 | 50 |
| Básico | basic | $29/mes | 3 | 200 |
| Profesional | pro | $79/mes | 10 | ∞ |
| Enterprise | enterprise | $199/mes | ∞ | ∞ |

- Feature gating via `checkFeatureAccess(tenantId, featureKey)`
- Límites via `checkLimits(tenantId, resource)` — devuelve current/limit
- Stripe integrado (webhook + checkout sessions) — modo stub si no hay clave

### Super Admin
- Rol `superadmin` con acceso global a todos los tenants
- `GET /api/v1/super-admin/stats` — estadísticas globales
- CRUD completo de tenants via `/api/v1/super-admin/tenants`
- Frontend: `/super-admin/` dashboard, `/super-admin/tenants` lista

### Onboarding de Tenants
- `POST /api/v1/saas/onboard` — crea tenant + suscripción trial + admin user
- Frontend: `/saas/register` wizard 3 pasos (info → credenciales → plan)
- `POST /api/v1/saas/checkout` — crea Stripe Checkout Session

### Feature Gating
- Middleware: `requireFeature('ml')` y `requireLimit('doctors')` para endpoints
- Permite per-tenant overrides via tabla `tenant_features`

### Módulos Nuevos
| Módulo | Descripción |
|--------|-------------|
| `src/modules/saas/` | Planes, suscripciones, checkout, usage, onboarding |
| `src/modules/super-admin/` | Gestión global de tenants y stats |
| `src/shared/multi-tenant.service.ts` | Carga/refresh de tenants desde DB |
| `src/shared/stripe.service.ts` | Stripe wrapper con stub mode |
| `src/shared/usage.middleware.ts` | Tracking de uso por tenant |
| `src/shared/query.ts` | Helpers `tenantQuery.build()`, `tenantQuery.where()` |
| `src/shared/booking-utils.ts` | Shared slot validation (availability, exceptions, overlap) for booking + guest |
| `src/modules/i18n/` | `GET /api/v1/i18n/translations` — exposes all translations for frontend to fetch |
| `src/shared/i18n.service.ts` | Backend i18n service — 421+ keys × 4 locales (es/en/pt/fr) |
| `frontend/src/i18n/useI18n.js` | Frontend hook + I18nContext + I18nProvider — API-backed with localStorage cache |
| `frontend/src/i18n/translations.js` | Frontend embedded fallback translations — 18 prefix groups |

### Frontend SaaS
| Ruta | Página |
|------|--------|
| `/saas/register` | Registro de nueva clínica (3 pasos) |
| `/saas/plans` | Planes y precios + checkout |
| `/saas/success` | Confirmación pago/registro |
| `/admin/tenant` | Dashboard de la clínica (suscripción, límites, uso) |
| `/super-admin/` | Dashboard global super admin |
| `/super-admin/tenants` | Lista de tenants + CRUD |
| `/super-admin/tenants/:id` | Detalle/edición de tenant |

### Env Variables Nuevas
- `STRIPE_SECRET_KEY` — Stripe secret key (opcional, sin ella funciona en stub)
- `STRIPE_WEBHOOK_SECRET` — Stripe webhook secret (opcional)
