# Clinic Backend — Contexto Completo para IA

## Stack
- **Backend**: Node.js + Express 5 + TypeScript + PostgreSQL 15
- **Frontend**: React 19 + Vite 6 + MUI + FullCalendar + Recharts
- **ML**: TensorFlow.js (4 modelos)
- **Auth**: JWT (15min access + 30d refresh rotation) + 2FA TOTP + reCAPTCHA v2
- **Multi-tenant**: Shared DB con tenant_id, feature gating, planes Stripe
- **Tests**: Vitest + supertest — 1122 tests, 93 archivos, 89% coverage
- **Despliegue**: Render (Node.js 20.x), PostgreSQL 15

## Puerto
- API: 3000, Frontend: 5173, DB: 5432

## Estructura del Proyecto
```
src/
├── app.ts                    # Express bootstrap, migrations, cron, seed
├── middlewares/              # auth, role, security, validate, errorHandler, requestLogger, asyncHandler, tenant, usage, csrf, sessionActivity, monitoring, apiVersionRedirect
├── modules/                  # 23 módulos (ver tabla abajo)
├── shared/                   # db, jwt, rut, email, sms, notification, date, query, multi-tenant, stripe, i18n, booking-utils, queue, sentry, consent
├── utils/                    # logger (Winston), errors (AppError classes)
├── jobs/                     # reminder.job, confirmation.job
└── seed/                     # admin.seed, seed
frontend/src/
├── context/AuthContext.jsx   # Auth state + login/logout/register
├── routes/AppRoutes.jsx      # 18 rutas frontend
├── i18n/useI18n.js           # I18n hook + API fetch + localStorage cache
├── api/axios.js              # Axios con interceptors
└── pages/                    # 20+ páginas
db/
├── init.sql                  # Schema base (28+ tablas, índices, triggers, seeds)
└── migrations/               # 32 migrations incrementaless
tests/                        # Unit + Integration + ML
```

## 23 Módulos Backend
| Módulo | Endpoints clave |
|--------|----------------|
| auth | register, login, refresh, logout, 2FA, change-password, forgot/reset-password, invite |
| booking | CRUD bookings, available-slots, doctor agenda, daily-density |
| doctor | CRUD doctors, register, invite, users list, toggle active |
| availability | Weekly blocks (day_of_week) |
| exception | Full/partial day exceptions |
| guest | Guest booking, RUT lookup, cancel with token |
| clinical-record | EHR, prescriptions, CIE-10 catalog, PDF receta, versioning, PHI encryption |
| analytics | Dashboard, bookings, top-doctors, no-shows, diagnoses, demand, vitals, Excel export |
| billing | Invoices, payments, insurance claims, idempotency keys |
| laboratory | Lab tests, requests, results |
| audit | Audit log queries |
| rbac | Permissions query |
| ml | 4 TF.js models: noShow (12 features), diagnosis (TF-IDF), demand (LSTM/statistical), vitals (z-score) |
| saas | Planes, suscripciones, checkout Stripe, onboarding, usage |
| super-admin | CRUD tenants global, stats, usuarios cross-tenant |
| webhook | CRUD webhooks + delivery tracking |
| i18n | Exponer traducciones vía API |
| specialties | CRUD especialidades |
| monitoring | Health, memory, DB pool, slow queries, table sizes, logs, GC |
| compliance | GDPR export/erase/consent |
| fhir | FHIR R4 (Patient, Appointment) |
| notification | Servicio multicanal |
| patient | Servicio (solo lógica) |

## API Routes — Todas bajo /api/v1/ (con redirect desde /api/)

### Auth
POST /register, /login, /refresh, /logout, /logout-all, /change-password, /forgot-password, /reset-password, /2fa/enable, /2fa/verify, /2fa/disable
GET /.well-known/jwks.json, /invite-info

### Doctors
GET /, /public, /me, /users
POST /register, /, /invite
PATCH /users/:id/active

### Bookings
POST /, GET /me, /available-slots, /doctor, /doctor/daily-density
DELETE /:id

### Clinical Records
GET /, /:id, /patient/:id, /cie10/search, /cie10/categories, /cie10/:code, /:id/prescriptions, /prescriptions/:id/pdf
POST /, /prescriptions
PUT /:id, /prescriptions/:id
DELETE /:id, /prescriptions/:id

### Analytics
GET /dashboard, /bookings-by-month, /top-doctors, /status-distribution, /my-stats, /no-shows, /diagnoses, /demand, /schedules, /vitals, /export-excel

### SaaS
GET /plans, /subscription, /usage, /usage/summary, /limits
POST /webhook/stripe, /onboard, /checkout, /change-plan, /cancel
PATCH /tenant

### Super Admin
GET /stats, /analytics/dashboard, /analytics/top-tenants, /analytics/revenue, /analytics/growth, /tenants, /tenants/:id, /users
POST /tenants
PATCH /tenants/:id, /users/:id/active
DELETE /tenants/:id

### ML
POST /train, /predict-noshow, /classify-diagnosis, /analyze-vitals, /cache/clear, /reset
GET /status, /health, /metrics, /demand-forecast, /optimal-schedules, /history/predictions, /history/metrics, /history/forecast, /export/predictions, /export/metrics, /export/forecast, /powerbi-export

### Compliance
GET /export, /consents
DELETE /erase
POST /consents

## Seguridad
- Helmet (CSP, HSTS 1y, XSS, noSniff, Frameguard)
- CORS: whitelist localhost:5173 + FRONTEND_URL + RENDER_EXTERNAL_URL
- Rate limits: Global 500/15min, Auth 10/15min, ForgotPwd 3/15min, ML train 5/h, ML predict 30/min, Guest book 5/h
- Body limit: 100kb
- JWT secret ≥ 32 chars, refresh rotation
- bcrypt 12 rounds, password complexity (8+ chars, upper, lower, number, special)
- 2FA TOTP (30s, ±1 step, hi-base32)
- PHI access logging en clinical records
- GDPR: export/erase/consent endpoints
- CSRF cookie-based (exempts webhooks/health)
- PostgreSQL advisory locks en booking creation (race condition)

## Multi-tenancy
- Shared DB con tenant_id en tablas
- Resolución: subdominio o X-Tenant-Id header
- middleware tenant.middleware.ts → req.tenant_id + req.locale
- multi-tenant.service.ts: carga tenants desde DB cada 30s
- Planes: Free ($0, 1 doc, 50 pac), Basic ($29, 3 docs, 200 pac), Pro ($79, 10 docs, ∞), Enterprise ($199, ∞, ∞)
- Feature gating: requireFeature('ml') middleware
- Super admin rol superadmin con acceso global

## ML (TensorFlow.js) — 4 modelos
- noShowModel: clasificación binaria, 12 features (hora, día, mes, historial, blocked, days_advance, monthly_bookings, specialty, etc.)
- diagnosisModel: clasificación multiclase, TF-IDF vectorization
- demandModel: LSTM + statistical fallback (media móvil con estacionalidad)
- vitalAnomalyModel: z-score (threshold=2.0) + riesgo cardiovascular
- Cache LRU 100 entradas, 5min TTL
- Entrenamiento vía BullMQ (fallback in-memory)
- Métricas: predicciones, latencia, errores por modelo

## i18n
- 4 locales: es (completo), en (completo), pt (~106 keys), fr (copia de es)
- 421+ keys, fallback a español
- API: GET /api/v1/i18n/translations
- Frontend: useI18n hook + I18nProvider + localStorage cache 5min + custom event locale:changed

## Frontend Routing (18 rutas)
/ (Home), /login, /register, /booking, /specialists, /my-bookings,
/doctor, /doctor/availability, /doctor/calendar, /doctor/clinical-records,
/admin/register-doctor, /admin/analytics, /admin/tenant,
/saas/register, /saas/plans, /saas/success,
/super-admin, /super-admin/tenants, /super-admin/tenants/:id

## Auth Frontend
- AuthContext: loading empieza true, restaura sesión de localStorage si token no expiró
- login() con captcha + 2FA support, register() con nombre completo
- logout() limpia localStorage síncrono antes de API call
- Interceptor 401 → refresh automático
- Evento custom auth:expired

## Base de Datos
- 28+ tablas: users, doctors, bookings, availability, exceptions, clinical_records, prescriptions, cie10_catalog, audit_logs, invoices, payments, insurance_claims, lab_tests, lab_requests, lab_request_items, permissions, role_permissions, user_permissions, ml_prediction_history, ml_model_metrics, ml_demand_forecast, specialties, tenants, subscriptions, tenant_features, webhooks, webhook_deliveries, refresh_tokens, notifications, notification_preferences, user_consents, phi_access_log, tenant_usage, session_activity, clinical_record_versions, password_reset_tokens
- 30+ índices (incluyendo funcionales, parciales, compuestos)
- 6 triggers updated_at
- 32 migrations

## Notificaciones
- Email: SendGrid (principal) + Gmail SMTP (fallback), per-tenant from address
- SMS/WhatsApp: Twilio (modo log sin SDK)
- Servicio unificado: notification.service.ts
- Cron: reminder cada 5min (24h y 1h antes)
- Cola: BullMQ con Redis (fallback in-memory)

## Seed Users
| Rol | Email | Password |
|-----|-------|----------|
| Admin | admin@clinic.com | REPLACED_PASSWORD |
| Doctor | juan/maria/carlos/ana@clinic.com | REPLACED_PASSWORD |
| Patient | user1/2/3@clinic.com | REPLACED_PASSWORD |

## Comandos
npm run dev — Dev server (tsx watch)
npm start — Production (node dist/app.js)
npm test — Tests + coverage
npm run typecheck — TypeScript check
npm run build — Compile TS + build frontend

## Patrón de Módulo
```
module/
├── module.controller.ts   # Express handlers con asyncHandler
├── module.service.ts      # Business logic + DB queries
├── module.routes.ts       # Router definition
├── module.schema.ts       # Zod validation schemas
```

## Convenciones API
- Paginación: { data: [...], pagination: { page, limit, total, totalPages } }
- Auth: Authorization: Bearer <token>, req.user = { id, email, role, rut, tenant_id }
- Errores: { error, details[], stack } (stack solo desarrollo)
- Validación: Zod schemas con middleware validateZod(schema, 'body'|'params'|'query')

## Tests Gotchas
- vi.mock paths relativas al test file, no al source
- DB mocked via vi.hoisted() sobre pool.query
- ML cache mock: usar path '../../src/modules/ml/ml.cache.js' relativo a tests/unit/

## Estructura Frontend Clave
- frontend/src/context/AuthContext.jsx — estado auth
- frontend/src/context/useAuth.js — hook wrapper (HMR fix — importar de aquí, no directo)
- frontend/src/api/axios.js — instancia axios con interceptors
- frontend/src/i18n/useI18n.js — hook i18n
- frontend/src/i18n/translations.js — fallback embebido (421 keys × 4 locales)
- frontend/src/pages/ — 20+ páginas
- frontend/src/routes/AppRoutes.jsx — todas las rutas

## URLs Importantes
- Bookings auto-confirmados al crearse (email es solo notificación)
- CSP permite google.com/recaptcha/ y gstatic.com/recaptcha/
- SendGrid es provider email principal si SENDGRID_API_KEY definida
- Stripe modo stub si no hay STRIPE_SECRET_KEY
