---
tags: [sistema, arquitectura, resumen]
---

# 🏥 Vitaria — Resumen Completo del Sistema

> Sistema SaaS de gestión clínica multi-tenant. Monolito modular backend con Node.js + Express + React + PostgreSQL.
> ⚠️ Documento actualizado contra el código real (2026-09-01).

## Visión General

| Atributo | Valor |
|----------|-------|
| **Propósito** | Gestión de clínicas: reservas, historias clínicas, laboratorio, facturación, analytics, SaaS |
| **Arquitectura** | Monolito modular (backend) + SPA (frontend) + base de datos compartida multi-tenant con RLS |
| **Backend** | Node.js 20 + Express 4.21 + TypeScript 5.8 |
| **Frontend** | React 19 + Vite 6 + TypeScript 5.7 (strict) + MUI 6 |
| **Base de Datos** | PostgreSQL 15 (sin ORM, SQL puro con `pg`) + Row-Level Security |
| **Idiomas** | Español, Inglés, Portugués, Francés (4, con paridad de claves) |
| **Despliegue** | Docker + Render (free tier) |

---

## 🏛️ Backend (`src/`)

### Estructura
```
src/
  app.ts                  # Entry point, middlewares, rutas, migraciones, boot
  @types/                 # Type augmentations (Express)
  types/                  # Shared interfaces y roles
  utils/                  # Logger, error classes, catálogo de códigos de error
  shared/                 # 20 servicios compartidos (DB pool, JWT, crypto, email, queue, i18n, ownership…)
  middlewares/            # 11 middlewares + helpers
  modules/                # 23 módulos de feature
  seed/                   # seed.ts + admin.seed.ts (tenant default, superadmin, backfills)
  jobs/                   # 2 cron jobs (reminders, audit integrity)
```

### Módulos (23)
| Módulo | Prefijo API | Archivos |
|--------|-------------|----------|
| [[02-BACKEND/Modulos/Auth\|Auth]] | `/api/auth` | 4 |
| [[02-BACKEND/Modulos/Doctor\|Doctor]] | `/api/doctors` | 5 |
| [[02-BACKEND/Modulos/Booking\|Booking]] | `/api/bookings` | 5 |
| [[02-BACKEND/Modulos/Availability\|Availability]] | `/api/availability` + `/api/availability-exceptions` | 4+4 |
| [[02-BACKEND/Modulos/Guest\|Guest]] | `/api/guest` | 5 |
| [[02-BACKEND/Modulos/ClinicalRecord\|Clinical Record]] | `/api/clinical-records` | 7 |
| Clinical Templates | `/api/clinical-templates` | 4 |
| Medical History | `/api/medical-history` | 3 |
| Calendar | `/api/calendar` | 4 + `ics.util.ts` |
| [[02-BACKEND/Modulos/Laboratory\|Laboratory]] | `/api/laboratory` | 7 |
| Laboratory Events / PDF / Email | internos | — |
| [[02-BACKEND/Modulos/Analytics\|Analytics]] | `/api/analytics` | 3 |
| [[02-BACKEND/Modulos/Billing\|Billing]] | `/api/billing` | 4 |
| [[02-BACKEND/Modulos/SaaS\|SaaS]] | `/api/saas` | 4 |
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
4. `GET /health` y `GET /api/health`
5. `cors` (whitelist localhost:5173 + FRONTEND_URL + RENDER_EXTERNAL_URL)
6. (Producción) static `frontend/dist` + fallback SPA
7. `cookieParser(COOKIE_SECRET)`
8. `express.json` (límite 100KB)
9. `csrfProtection` (double-submit, cookie + header)
10. `optionalAuth` (extrae JWT si existe)
11. `tenantMiddleware` (resuelve tenant, ejecuta `set_tenant_id()`, dispara RLS)
12. `trackActivity` (session activity, throttle 5 min)
13. `correlationIdMiddleware` (`X-Request-ID`)
14. `requestLogger` (log método/ruta/status/duración)
15. `globalLimiter` (500 req/15 min)
16. `authLimiter` (10 req/15 min en `/api/auth`)
17. `phiWriteLimiter` (30 req/15 min en `/api/clinical-records`)
18. Routers de los 23 módulos
19. `setupExpressErrorHandler` (Sentry) → `notFoundHandler` → `errorHandler`

### Autenticación
- **JWT HS256**: Access token (15 min) + Refresh token (30 días, SHA256 en DB, rotación)
- **2FA/TOTP**: Secreto cifrado AES-256-GCM, verificación timing-safe
- **reCAPTCHA**: Opcional en login (`react-google-recaptcha`)
- **Bloqueo**: 5 intentos fallidos = 15 min de bloqueo
- **Token versioning**: Cambio de contraseña invalida todos los tokens (`token_version`)
- **Sesiones**: Tabla `user_sessions` con TTL 30 días; endpoints `/auth/sessions`
- **CSRF**: SameSite + header `X-CSRF-Token` en métodos no seguros

### Multi-tenancy
- **Modelo**: Base de datos compartida, RLS **FORCE** en 47 tablas
- **Resolución**: Header `X-Tenant-Id` o claim del JWT; por sesión PG `set_config('app.tenant_id', …)`
- **Boot**: `tenantService.loadFromDB()` con caché por dominio (TTL 5 min)
- **Aislamiento**: RLS `current_setting('app.tenant_id', true)` + `WHERE tenant_id = $N` + checks BOLA en `ownership.ts`

### Roles de Usuario
`superadmin` | `admin` | `doctor` | `lab_technician` | `patient` | `guest` | `user`

### Rate Limiters
| Limiter | Ventana | Máximo | Alcance |
|---------|---------|--------|---------|
| Global | 15 min | 500 | Toda la API (skip /health) |
| Auth | 15 min | 10 | `/api/auth` |
| PHI Write | 15 min | 30 | `/api/clinical-records` |
| Guest Booking | 1 hora | 5 | `/api/guest/booking` |
| RUT Lookup | 15 min | 3 | `/api/guest/bookings/:rut` |
| SaaS Onboard | 1 hora | 3 | `/api/saas/onboard` |

### Validación
**Zod v4** (backend) con factory `validateZod(schema, source)` que reemplaza `body/params/query` con dato parseado. El frontend usa **zod v3** (react-hook-form resolvers).

### Servicios Compartidos (20)
| Servicio | Propósito |
|----------|-----------|
| `db.ts` | Pool principal (max 25) + `readPool` opcional, SSL dinámico con `DB_CA_CERT`, timeouts |
| `jwt.service.ts` | Firma/verificación JWT HS256 (15 min app, 24h invites) |
| `crypto.service.ts` | AES-256-GCM con PBKDF2 para secrets 2FA, hash SHA256 de tokens |
| `email.service.ts` | Multi-proveedor: SendGrid > SMTP > Log |
| `multi-tenant.service.ts` | Caché in-memory de inquilinos (TTL 5 min) |
| `stripe.service.ts` | Cliente Stripe (stub si no hay `STRIPE_SECRET_KEY`) |
| `queue.service.ts` | Cola de jobs sobre tabla `jobs` con retry/backoff (30s/2m/8m) |
| `sessions.service.ts` | Crear/revocar sesiones, token hasheado, TTL 30 días |
| `sentry.service.ts` | Sentry.io opcional |
| `i18n.service.ts` | Traducciones server-side (es/en; pt/fr incompletas) |
| `sanitize.ts` | Stripping HTML, sanitización estricta, redacción de campos sensibles |
| `ownership.ts` | Chequeos BOLA fail-closed médico↔paciente |
| `booking-utils.ts` | Reglas de agendamiento (feriados, disponibilidad, overlap) |
| `booking-history.ts` | Registro de cambios de estado de reserva |
| `rut.ts` | Validación/formateo de RUT chileno |
| `query.ts` | Helpers de query params + SQL parametrizado multi-tenant |
| `escape.ts` / `date.ts` / `base32.ts` | Utilidades HTML, fechas, Base32/TOTP |
| `seed-status.ts` | Estado de seed compartido |

### Seguridad en Startup
- `validateEnvSecurity()` exige `JWT_SECRET`, `COOKIE_SECRET` (≠ JWT_SECRET), `AUDIT_HMAC_SECRET`, `DATABASE_URL`
- `ENCRYPTION_KEY` y `RECAPTCHA_SECRET_KEY` opcionales con warning
- Conexión a DB con retry (10 intentos, backoff exponencial)
- Seed con contraseñas solo vía env (`SUPERADMIN_PASSWORD`, `ADMIN_PASSWORD`); en producción aborta si faltan

---

## 🎨 Frontend (`frontend/`)

### Stack
- **React 19** + **TypeScript 5.7** (`strict: true` + `noUncheckedIndexedAccess`)
- **Vite 6** + @vitejs/plugin-react-swc
- **react-router-dom v7** con **lazy loading total** (50 imports lazy en `AppRouter.tsx`)
- **MUI 6** (@mui/material + @emotion) + **TanStack Query 5** + TanStack Table 8
- **Axios** con interceptores (CSRF, tenant, queue de refresh)
- **i18next** (`i18n.ts` + locales JSON): 4 idiomas, 66 namespaces, ~3.500 claves c/u, paridad verificada
- **recharts 2**, **@fullcalendar 6**, **framer-motion 11**, **react-hook-form 7 + zod 3**, **react-hot-toast**, **react-google-recaptcha**

### Estructura
```
frontend/src/
  main.tsx              # Entry: QueryClient > BrowserRouter > Theme > Auth > Feature > ErrorBoundary > AppRouter
  app/                  # config/ (fonts, global.css) + router/AppRouter.tsx
  modules/              # 27 módulos por feature (208 archivos)
  shared/               # 34 archivos: components/, constants/, hooks/, providers/, services/, types/, utils/
  i18n/                 # i18n.ts + locales/{es,en,pt,fr}.json
  test/                 # 178 archivos de test (components, hooks, pages, services, utils, providers, routes)
```

### Providers
| Provider | Función |
|----------|---------|
| `QueryClientProvider` | TanStack Query |
| `AppThemeProvider` | Tema claro/oscuro MUI |
| `AuthProvider` | Auth (login/register/logout/2FA), token en memoria |
| `FeatureProvider` | Feature flags por plan SaaS (`useFeature`) |
| `LabSSEProvider` | Server-Sent Events del laboratorio |

### Layouts
`AuthLayout`, `DashboardLayout` (sidebar dinámica por rol), `PatientLayout` (bottom-nav paciente), `SidebarItem`.

### API Layer (`shared/services/api-client.ts`)
- **Único cliente central** + 24 servicios por módulo
- `baseURL: VITE_API_URL || '/api'`, `withCredentials: true`, timeout 30s
- **Request interceptor**: `Authorization: Bearer`, `X-Tenant-Id` (localStorage), `X-CSRF-Token` (cookie)
- **Response interceptor**: captura CSRF/tenant de headers, refresh con cola de subscribers, toasts de error i18n, respeta cancelaciones

### Páginas (53) y Componentes Compartidos (18)
- 53 páginas lazy en `modules/*/pages/` + LandingPage
- 18 componentes shared en `shared/components/`: `ErrorBoundary`, `LanguageSwitcher`, `PremiumLocked`, `WithFeature`, layouts (Auth/Dashboard/Patient/SidebarItem), UI (`Combobox`, `ConfirmDialog`, `DataTable`, `EmptyState`, `ErrorState`, `LoadingState`, `PageHeader`, `Pagination`, `PlaceholderPage`), `lab-icons/LabIcons`
- Detalle en [[03-FRONTEND/Componentes\|Componentes]]

### Routing y Roles
| Tipo | Guard | Ejemplos |
|------|-------|----------|
| Públicas | — | `/` landing, `/register`, `/forgot-password`, `/2fa`, `/booking`, `/confirm/:token` |
| Públicas + auth | `ProtectedRoute` | `/dashboard`, `/bookings`, `/settings` |
| Por rol | `ProtectedRoute` + `allowedRoles` | `/super-admin/*`, `/clinical-records`, `/laboratory/*` |
| Por feature | `FeatureRoute` (`laboratory`) | `/laboratory/*` con fallback `<PremiumLocked/>` |

> Nota: `LoginPage` existe pero **no está enrutada**; el login ocurre en la landing `/`. Los `ProtectedRoute` redirigen a `/`.

---

## 🗄️ Base de Datos

### Motor
- **PostgreSQL 15** vía `pg` (node-postgres), sin ORM
- Pool: max 25 conexiones, SSL dinámico (interno sin SSL, externo con CA opcional), read replica opcional
- Migraciones: SQL secuenciales en `db/migrations/` (001–023), tracking en `_migrations`
- `db/init.sql` es el schema consolidado (aplica completo si `users` no existe); luego se re-aplican las 23 migraciones incrementales

### Entidades (47 tablas en `init.sql`)
`tenants`, `users`, `doctors`, `bookings`, `doctor_availability`, `doctor_exceptions`, `clinical_records`, `prescriptions`, `cie10_catalog`, `audit_logs`, `invoices`, `invoice_items`, `payments`, `insurance_claims`, `lab_areas`, `lab_tests`, `lab_requests`, `lab_request_items`, `refresh_tokens`, `password_reset_tokens`, `specialties`, `plans`, `subscriptions`, `subscription_invoices`, `tenant_features`, `tenant_usage`, `_migrations`, `booking_series`, `booking_status_history`, `notifications`, `waitlist`, `clinic_holidays`, `medical_history`, `user_sessions`, `attachments`, `reports`, `webhook_subscriptions`, `webhook_deliveries`, `lab_samples`, `lab_qc_records`, `lab_equipment`, `lab_reagents`, `lab_notifications`, `lab_result_history`, `jobs`, `ml_demand_forecast`, `clinical_templates`

### Seguridad en DB
- **RLS FORCE** en 47 tablas con política `tenant_isolation` (`current_setting('app.tenant_id')`), base de datos compartida
- Parches 020–023 para PostgreSQL manejado (PgBouncer/Render): GUC `app.tenant_id`, fallbacks, superadmin, audit `tenant='system'`
- `audit_logs` con cadena **HMAC-SHA256** verificable cada 6 h
- Secrets 2FA cifrados **AES-256-GCM**; passwords **bcrypt 12 rounds** (`CHECK length >= 60`)
- Triggers `updated_at` (15 tablas) + triggers de auditoría (`audit_security_changes`, `audit_phi_changes`)
- ~75 índices compuestos multi-tenant + parciales

---

## 🐳 DevOps

### Docker
- **Dockerfile** (prod): multi-stage `node:20-alpine`, usuario no-root, healthcheck `/health`
- **Dockerfile.dev**: `npm run dev` con bind mount
- **docker-compose.yml**: db (postgres:15-alpine, `127.0.0.1:5432`, monta init/security/conf) + backend (:3000) + frontend (:5173) · red interna `db-net`
- **docker-compose.prod.yml**: backend + frontend (nginx) · 18 env vars backend

### CI/CD (GitHub Actions — `ci.yml`)
- **Triggers**: push/PR a `master`, `main`, `develop`
- **Job backend**: postgres:15 service → `npm ci` → `npm audit --audit-level=critical` → `npm run typecheck` → `npm test` → `npm run build:backend`
- **Job frontend**: `npm ci` → `npm run type-check` → `npm test` → `npm test -- --coverage` → `npm run build`
- **Pendiente**: lint/ESLint, deploy automático en pipeline, subida de coverage

### Monitoreo
- **Winston** (console + archivo `error.log` rotado 10MB×5)
- **Sentry** opcional (`SENTRY_DSN`)
- Health check `/health` (DB, pool, stripe)
- `verifyAuditChain()` cada 6 h calibrado con cron `0 */6 * * *`
- Cola `jobs` con `registerWorkers()` + `startQueueProcessor()`

---

## 🤖 Machine Learning
- **Estado**: Stub/simulación — **no hay TensorFlow.js ni modelos entrenados** (ni en `src/` ni en `dist/`)
- Existe la tabla **`ml_demand_forecast`** (tenant_id, date, predicted_demand, actual_demand, confidence)
- Endpoint `GET /api/analytics/demand` → `smaForecast()`: **media móvil simple de 7 días**, no un modelo predictivo real
- Ver [[06-MACHINE-LEARNING/MachineLearning\|MachineLearning]]

---

## 🔒 Seguridad General

| Capa | Mecanismo |
|------|-----------|
| Transporte | HTTPS en producción, HSTS |
| HTTP | Helmet (CSP, frameguard, no sniff), HPP, Permissions-Policy |
| Auth | JWT + refresh + 2FA TOTP + reCAPTCHA + token versioning + sesiones |
| API | Rate limiting (6 niveles), CORS whitelist, body 100KB, CSRF double-submit |
| DB | RLS FORCE por tenant, SQL parametrizado, CHECK constraints |
| Datos | AES-256-GCM (secrets), bcrypt 12 (passwords), sanitize-html |
| Autorización | RBAC `authorize(...)`, feature gating, chequeos BOLA `ownership.ts` |
| Auditoría | HMAC-SHA256 encadenado, verificación periódica 6h |

---

## Métricas del Proyecto

| Métrica | Valor |
|---------|-------|
| Archivos backend (`src/`) | 140 `.ts` |
| Archivos frontend (`frontend/src/`) | 431 (303 `.tsx`) |
| Endpoints de API | 204 (202 routers + 2 health) |
| Páginas frontend | 53 |
| Componentes compartidos | 18 |
| Módulos backend | 23 |
| Middlewares | 11 |
| Shared services | 20 |
| Rol de usuario | 7 |
| Tablas en DB | 47 |
| Migraciones | 23 |
| Planes SaaS | 4 |
| Idiomas | 4 (66 namespaces, ~3.500 claves c/u) |
| Tests backend | ~1.5k casos en 111 archivos |
| Tests frontend | ~1.2k casos en 178 archivos |
| Cobertura | Backend ~89% líneas (threshold 85%) · Frontend ~84% (threshold 80%) |
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