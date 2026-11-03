---
tags: [sistema, arquitectura, resumen]
---

# 🏥 Vitaria — Resumen Completo del Sistema

> Sistema SaaS de gestión clínica multi-tenant. Monolito modular backend con Node.js + Express + React + PostgreSQL.
> ⚠️ Documento actualizado contra el código real (**2026-11-02**).

## Visión General

| Atributo | Valor |
|----------|-------|
| **Propósito** | Gestión de clínicas: reservas, historias clínicas, laboratorio, facturación, analytics, SaaS |
| **Arquitectura** | Monolito modular (backend) + SPA (frontend) + base de datos compartida multi-tenant con RLS |
| **Backend** | Node.js 20 + Express 4.22 + TypeScript 5.8 |
| **Frontend** | React 19 + Vite 6 + TypeScript 5.7 (strict) + MUI 6 |
| **Base de Datos** | PostgreSQL 15 (sin ORM, SQL puro con `pg`) + Row-Level Security |
| **Autenticación** | SSO con el Core AMG (`@amg/auth-client`), cookie `app_session` |
| **Idiomas** | Español, Inglés, Portugués, Francés (4, con paridad de claves) |
| **Despliegue** | Docker + Render (free tier) |

---

## 🏛️ Backend (`src/`)

### Estructura
```
src/
  app.ts                  # Entry point, middlewares, SSO guard, rutas, migraciones, boot
  @types/                 # Type augmentations (Express)
  types/                  # Shared interfaces y roles
  utils/                  # Logger, error classes, catálogo de códigos de error
  shared/                 # 23 servicios compartidos (DB pool, crypto, email, queue, i18n, ownership…)
  middlewares/            # 12 middlewares + helpers
  modules/                # 24 módulos de feature
  sso/                    # Integración SSO con el Core AMG
  seed/                   # seed.ts + admin.seed.ts (tenant default, superadmin, backfills)
  jobs/                   # 2 cron jobs (reminders, audit integrity)
```

### Módulos (24)
| Módulo | Prefijo API | Archivos |
|--------|-------------|----------|
| [[02-BACKEND/Modulos/Auth\|Auth]] (SSO + invitación) | `/api/auth` | 4 |
| [[02-BACKEND/Modulos/Doctor\|Doctor]] | `/api/doctors` | 5 |
| [[02-BACKEND/Modulos/Booking\|Booking]] | `/api/bookings` | 5 |
| [[02-BACKEND/Modulos/Availability\|Availability]] | `/api/availability` + `/api/availability-exceptions` | 4+4 |
| [[02-BACKEND/Modulos/Guest\|Guest]] | `/api/guest` | 5 |
| [[02-BACKEND/Modulos/ClinicalRecord\|Clinical Record]] | `/api/clinical-records` | 7 |
| Clinical Templates | `/api/clinical-templates` | 4 |
| Medical History | `/api/medical-history` | 3 |
| Calendar | `/api/calendar` | 5 |
| [[02-BACKEND/Modulos/Laboratory\|Laboratory]] | `/api/laboratory` | 7 |
| [[02-BACKEND/Modulos/Analytics\|Analytics]] | `/api/analytics` | 3 |
| [[02-BACKEND/Modulos/Billing\|Billing]] | `/api/billing` | 4 |
| [[02-BACKEND/Modulos/SaaS\|SaaS]] | `/api/saas` | 6 |
| Currencies | `/api/currencies` | 2 |
| [[02-BACKEND/Modulos/SuperAdmin\|Super Admin]] | `/api/super-admin` | 4 |
| [[02-BACKEND/Modulos/Audit\|Audit]] | `/api/audit` | 3 |
| [[02-BACKEND/Modulos/Specialties\|Specialties]] | `/api/specialties` | 3 |
| Reports | `/api/reports` | 4 |
| Notifications | `/api/notifications` | 4 |
| Waitlist | `/api/waitlist` | 4 |
| Holidays | `/api/holidays` | 4 |
| Attachments | `/api/attachments` | 4 |
| Data Portability | `/api/export` | 4 |
| Webhooks | `/api/webhooks` | 4 |

### Middleware Pipeline (orden real en `app.ts`)
1. `initSentry` (opcional)
2. `securityMiddleware` (Helmet + hpp + Permissions-Policy) + `validateEnvSecurity`
3. `compression` (gzip)
4. `GET /health`, `/api/health`, `/health/live`, `/metrics`
5. `cors` (whitelist localhost:5173 + FRONTEND_URL + APP_URL + PUBLIC_URL + RENDER_EXTERNAL_URL)
6. (Producción) static `frontend/dist` (assets públicos, `index: false`)
7. `cookieParser(COOKIE_SECRET)`
8. `express.json` (límite 100KB, captura `rawBody`)
9. **`mountAmgAuthMiddleware()`** — guard SSO: valida cookie `app_session`, deja `req.amg` o redirige al Core
10. `amgRouter` en `/api` (`/auth/login`, `/auth/me`, `/auth/inicio`)
11. `csrfProtection` (double-submit, cookie + header)
12. `optionalAuth`
13. `tenantMiddleware` (resuelve tenant, `set_tenant_id()`, dispara RLS)
14. `trackActivity` (session activity, throttle 5 min)
15. `correlationIdMiddleware` (`X-Request-ID`)
16. `requestLogger` (log método/ruta/status/duración)
17. `metricsMiddleware` (Prometheus)
18. `globalLimiter` (500 req/15 min)
19. `authLimiter` (10 req/15 min en `/api/auth/register`)
20. `phiWriteLimiter` (30 req/15 min en `/api/clinical-records`)
21. Routers de los 24 módulos
22. (Producción) catch-all SPA `GET /^\/(?!api\/)/`
23. `setupExpressErrorHandler` (Sentry) → `notFoundHandler` → `errorHandler`

### Autenticación (SSO con el Core)
- **Proveedor:** Core AMG (`CORE_URL`, `AMG_SSO_CLIENT_ID`, `AMG_SSO_CLIENT_SECRET`)
- **Sesión:** cookie firmada `app_session` emitida por el Core en `/auth/callback`
- **Rutas:** `/api/auth/login` (302 al Core), `/api/auth/me`, `/api/auth/inicio`, `/auth/callback`, `/auth/logout`
- **Identidad local:** `resolveLocalAccount()` mapea identidad → `users` + organización (`tenants`)
- **Único endpoint de credenciales local:** alta por invitación (`/api/auth/register` + `/api/auth/invite-info`)
- **2FA/reCAPTCHA:** gestionados por el Core
- **CSRF:** SameSite + header `X-CSRF-Token` en métodos no seguros
- **Actividad local:** `user_sessions` + `trackActivity`

### Multi-tenancy
- **Modelo:** Base de datos compartida, RLS **FORCE** en las tablas
- **Resolución:** organización del Core / header `X-Tenant-Id`; por sesión PG `set_config('app.tenant_id', …)`
- **Boot:** `tenantService.loadFromDB()` con caché por dominio (TTL 5 min)
- **Aislamiento:** RLS `current_setting('app.tenant_id', true)` + `WHERE tenant_id = $N` + checks BOLA en `ownership.ts`

### Roles de Usuario
`superadmin` | `admin` | `doctor` | `lab_technician` | `patient` | `guest` | `user`

### Rate Limiters
| Limiter | Ventana | Máximo | Alcance |
|---------|---------|--------|---------|
| Global | 15 min | 500 | Toda la API (skip /health, /metrics) |
| Auth | 15 min | 10 | `/api/auth/register` |
| PHI Write | 15 min | 30 | `/api/clinical-records` |
| Guest Booking | 1 hora | 5 | `/api/guest/booking` |
| RUT Lookup | 15 min | 3 | `/api/guest/bookings/:rut` |
| SaaS Onboard | 1 hora | 3 | `/api/saas/onboard` |

### Validación
**Zod v4** (backend) con factory `validateZod(schema, source)` que reemplaza `body/params/query` con dato parseado. El frontend usa **zod v3** (react-hook-form resolvers).

### Servicios Compartidos (23)
| Servicio | Propósito |
|----------|-----------|
| `db.ts` | Pool principal (max 25) + `readPool` opcional, SSL dinámico con `DB_CA_CERT`, timeouts |
| `jwt.service.ts` | Utilidades JWT remanentes (invitaciones) |
| `crypto.service.ts` | AES-256-GCM con PBKDF2, hash SHA256 de tokens |
| `email.service.ts` | Multi-proveedor: SendGrid > SMTP > Log |
| `multi-tenant.service.ts` | Caché in-memory de inquilinos (TTL 5 min) |
| `mercadopago.service.ts` | Cliente Mercado Pago CLP (Checkout Pro); stub sin token |
| `queue.service.ts` | Cola de jobs sobre tabla `jobs` con retry/backoff |
| `metrics.service.ts` | Métricas Prometheus (`/metrics`) |
| `cleanup.service.ts` | Limpieza periódica de datos |
| `currencies.ts` | Tipos de cambio multi-moneda |
| `sentry.service.ts` | Sentry.io opcional |
| `i18n.service.ts` | Traducciones server-side |
| `sanitize.ts` | Stripping HTML, sanitización estricta, redacción de campos sensibles |
| `ownership.ts` | Chequeos BOLA fail-closed médico↔paciente |
| `booking-utils.ts` | Reglas de agendamiento (feriados, disponibilidad, overlap) |
| `booking-history.ts` | Registro de cambios de estado de reserva |
| `alerts.service.ts` | Alertas operativas |
| `captcha.service.ts` | Verificación reCAPTCHA |
| `rut.ts` | Validación/formateo de RUT chileno |
| `query.ts` | Helpers de query params + SQL parametrizado multi-tenant |
| `escape.ts` / `date.ts` | Utilidades HTML y fechas |
| `seed-status.ts` | Estado de seed compartido |

### Seguridad en Startup
- `validateEnvSecurity()` exige `JWT_SECRET`, `COOKIE_SECRET` (≠ JWT_SECRET), `AUDIT_HMAC_SECRET`, `DATABASE_URL`
- SSO: `CORE_URL`, `AMG_SSO_CLIENT_ID`, `AMG_SSO_CLIENT_SECRET`
- `ENCRYPTION_KEY` y `RECAPTCHA_SECRET_KEY` opcionales con warning
- Conexión a DB con retry (10 intentos, backoff exponencial)
- Seed con contraseñas solo vía env; en producción aborta si faltan

---

## 🎨 Frontend (`frontend/`)

### Stack
- **React 19** + **TypeScript 5.7** (`strict: true` + `noUncheckedIndexedAccess`)
- **Vite 6** + @vitejs/plugin-react-swc
- **react-router-dom v7** con **lazy loading total** (`AppRouter.tsx`)
- **MUI 6** (@mui/material + @emotion) + **TanStack Query 5** + TanStack Table 8
- **Axios** con interceptores (CSRF, 401 → login Core)
- **i18next 26** (`i18n.ts` + `locales/*.json`): 4 idiomas, 72 namespaces, ~3.750 claves c/u, paridad verificada
- **recharts 2**, **@fullcalendar 6**, **framer-motion 11**, **react-hook-form 7 + zod 3**, **react-hot-toast**, **react-google-recaptcha**

### Estructura
```
frontend/src/
  main.tsx              # Entry: QueryClient > BrowserRouter > Theme > Auth > Feature > ErrorBoundary > AppRouter
  app/                  # config/ (fonts, global.css) + router/AppRouter.tsx
  modules/              # 32 módulos por feature
  shared/               # components/, config/, constants/, hooks/, providers/, services/, types/, utils/
  i18n/                 # i18n.ts + locales/{es,en,pt,fr}.json
  test/                 # 184 archivos de test (components, hooks, pages, services, utils, providers, routes)
```

### Providers
| Provider | Función |
|----------|---------|
| `QueryClientProvider` | TanStack Query |
| `AppThemeProvider` | Tema claro/oscuro MUI |
| `AuthProvider` | Carga sesión desde `/api/auth/inicio`; login/logout navegan al Core |
| `FeatureProvider` | Feature flags por plan SaaS (`useFeature`) |
| `LabSSEProvider` | Server-Sent Events del laboratorio |

### Layouts
`AuthLayout`, `DashboardLayout` (sidebar dinámica por rol), `PatientLayout` (bottom-nav paciente), `SidebarItem`.

### API Layer (`shared/services/api-client.ts`)
- **Único cliente central**; servicios adicionales `analytics.ts` y `pricing.service.ts`
- `baseURL: VITE_API_URL || '/api'`, `withCredentials: true`, timeout 30s
- **Request interceptor**: `X-CSRF-Token` (cookie) en métodos de escritura
- **Response interceptor**: 401 → redirección única al login del Core, toasts de error i18n, respeta cancelaciones

### Páginas (61) y Componentes Compartidos (21)
- 61 páginas lazy en `modules/*/pages/` + LandingPage
- 21 componentes shared en `shared/components/`: `DocumentTitle`, `ErrorBoundary`, `LanguageSwitcher`, `PremiumLocked`, `Seo`, `WithFeature`, `ConsentBanner`, `LabIcons`, layouts (Auth/Dashboard/Patient/SidebarItem), UI (`Combobox`, `ConfirmDialog`, `DataTable`, `EmptyState`, `ErrorState`, `LoadingState`, `PageHeader`, `Pagination`, `PlaceholderPage`)
- Detalle en [[03-FRONTEND/Componentes\|Componentes]]

### Routing y Roles
| Tipo | Guard | Ejemplos |
|------|-------|----------|
| Públicas | — | `/` landing, `/register`, `/booking`, `/confirm/:token` |
| Públicas + auth | `ProtectedRoute` | `/dashboard`, `/bookings`, `/settings` |
| Por rol | `ProtectedRoute` + `allowedRoles` | `/super-admin/*`, `/clinical-records`, `/laboratory/*` |
| Por feature | `FeatureRoute` (`laboratory`) | `/laboratory/*` con fallback `<PremiumLocked/>` |

> El login ocurre en el Core; las rutas protegidas redirigen al login central cuando no hay sesión.

---

## 🗄️ Base de Datos

### Motor
- **PostgreSQL 15** vía `pg` (node-postgres), sin ORM
- Pool: max 25 conexiones, SSL dinámico, read replica opcional
- Migraciones: SQL secuenciales en `db/migrations/` (001–032, 035, 036), tracking en `_migrations`
- `db/init.sql` es el schema consolidado (**49 tablas**); luego se aplican las 34 migraciones incrementales

### Entidades (49 tablas en `init.sql`)
`tenants`, `users`, `doctors`, `bookings`, `doctor_availability`, `doctor_exceptions`, `clinical_records`, `prescriptions`, `cie`, `audit_logs`, `invoices`, `invoice_items`, `payments`, `insurance_claims`, `lab_areas`, `lab_tests`, `lab_requests`, `lab_request_items`, `refresh_tokens`, `password_reset_tokens`, `specialties`, `plans`, `subscriptions`, `subscription_invoices`, `tenant_features`, `tenant_usage`, `_migrations`, `booking_series`, `booking_status_history`, `notifications`, `waitlist`, `clinic_holidays`, `medical_history`, `user_sessions`, `attachments`, `reports`, `webhook_subscriptions`, `webhook_deliveries`, `lab_samples`, `lab_qc_records`, `lab_equipment`, `lab_reagents`, `lab_notifications`, `lab_result_history`, `jobs`, `ml_demand_forecast`, `tenant_onboarding`, `onboarding_documents`, `clinical_templates`

### Seguridad en DB
- **RLS FORCE** con política `tenant_isolation` (`current_setting('app.tenant_id')`), base compartida
- Parches 020–023, 035–036 para PostgreSQL manejado (PgBouncer/Render): GUC, fallbacks, superadmin, aislamiento SaaS
- `audit_logs` con cadena **HMAC-SHA256** verificable cada 6 h
- Secrets cifrados **AES-256-GCM**; passwords **bcrypt 12 rounds**
- Triggers `updated_at` + triggers de auditoría (`audit_security_changes`, `audit_phi_changes`)
- Índices compuestos multi-tenant + parciales (migraciones 027–029)

---

## 🐳 DevOps

### Docker
- **Dockerfile** (prod): multi-stage `node:20-alpine`, usuario no-root, healthcheck `/health`
- **Dockerfile.dev**: `npm run dev` con bind mount
- **docker-compose.yml**: db (postgres:15-alpine) + backend (:3000) + frontend (:5173)
- **docker-compose.prod.yml**: backend + frontend (nginx)

### CI/CD (GitHub Actions)
- `ci.yml` — triggers push/PR a `master`, `main`, `develop`
  - **backend**: postgres:15 → `npm ci` → `npm audit --audit-level=critical` → `npm run typecheck` → `npm test` → `npm run build:backend`
  - **rls-isolation**: `init.sql` + migraciones + bootstrap RLS + test de aislamiento real
  - **frontend**: `npm ci` → `npm run lint` → `npm run type-check` → `npm test` → coverage
- `backup.yml` — backup diario de base de datos

### Monitoreo
- **Winston** (console + archivo `error.log` rotado)
- **Sentry** opcional (`SENTRY_DSN`)
- Health check `/health` (DB, pool, mercadopago) + `/health/live`
- Métricas Prometheus `/metrics`
- `verifyAuditChain()` cada 6 h
- Cola `jobs` con `registerWorkers()` + `startQueueProcessor()`

---

## 🤖 Machine Learning
- **Estado**: Stub/simulación — **no hay TensorFlow.js ni modelos entrenados**
- Existe la tabla **`ml_demand_forecast`** (tenant_id, date, predicted_demand, actual_demand, confidence)
- Endpoint `GET /api/analytics/demand` → `smaForecast()`: **media móvil simple de 7 días**
- Ver [[06-MACHINE-LEARNING/MachineLearning\|MachineLearning]]

---

## 🔒 Seguridad General

| Capa | Mecanismo |
|------|-----------|
| Transporte | HTTPS en producción, HSTS |
| HTTP | Helmet (CSP, frameguard, no sniff), HPP, Permissions-Policy |
| Auth | SSO Core (`app_session`) + CSRF double-submit + sesiones locales |
| API | Rate limiting (6 niveles), CORS whitelist, body 100KB |
| DB | RLS FORCE por tenant, SQL parametrizado, CHECK constraints |
| Datos | AES-256-GCM (secrets), bcrypt 12 (passwords), sanitize-html |
| Autorización | RBAC `authorize(...)`, feature gating, chequeos BOLA `ownership.ts` |
| Auditoría | HMAC-SHA256 encadenado, verificación periódica 6h |

---

## Métricas del Proyecto

| Métrica | Valor |
|---------|-------|
| Archivos backend (`src/`) | 152 `.ts` |
| Archivos frontend (`frontend/src/`) | 460 (325 `.tsx`) |
| Endpoints de API | ~200 |
| Páginas frontend | 61 |
| Componentes compartidos | 21 |
| Módulos backend | 24 |
| Módulos frontend | 32 |
| Middlewares | 12 |
| Shared services | 23 |
| Roles de usuario | 7 |
| Tablas en DB | 49 |
| Migraciones | 34 |
| Planes SaaS | 4 |
| Idiomas | 4 (72 namespaces, ~3.750 claves c/u) |
| Tests backend | 1.538 passing (2 skipped) en 114 archivos |
| Tests frontend | 1.239 casos en 184 archivos |
| Cobertura | Backend 84.37% líneas (threshold 84%) · Frontend 84.16% (threshold 72%) |
| Versión Node | 20.x |
| Versión React | 19 |
| Versión Vite | 6 |
| Versión PostgreSQL | 15 |

---

## Relacionados

- [[Wiki|Volver al índice principal]]
- [[00-INICIO/Estado-Actual|Estado Actual]]
- [[03-FRONTEND/Frontend|Frontend]]
- [[02-BACKEND/Backend|Backend]]
- [[04-BASE-DE-DATOS/BaseDeDatos|Base de Datos]]
- [[05-DEVOPS/DevOps|DevOps]]
- [[07-SEGURIDAD/Seguridad|Seguridad]]

---

Tags: #sistema #arquitectura #resumen #completo
