---
tags: [sistema, arquitectura, resumen]
---

# 🏥 Clínica Salud Vital — Resumen Completo del Sistema

> Sistema SaaS de gestión clínica multi-tenant. Monolito modular backend con Node.js + Express + React + PostgreSQL.

## Visión General

| Atributo | Valor |
|----------|-------|
| **Propósito** | Gestión de clínicas: reservas, historias clínicas, laboratorio, facturación, analytics |
| **Arquitectura** | Monolito modular (backend) + SPA (frontend) + base de datos compartida multi-tenant |
| **Backend** | Node.js 20 + Express 4 + TypeScript 5 |
| **Frontend** | React 19 + Vite 8 + TypeScript 6 |
| **Base de Datos** | PostgreSQL 15 (sin ORM, SQL puro con `pg`) |
| **Idiomas** | Español, Inglés, Portugués, Francés |
| **Despliegue** | Docker + Render (free tier) |

---

## 🏛️ Backend (`src/`)

### Estructura
```
src/
  app.ts                  # Entry point, middleware, routes, startup
  @types/                 # Type augmentations (Express)
  types/                  # Shared interfaces
  utils/                  # Logger, error classes
  shared/                 # DB pool, JWT, crypto, email, queue, i18n, sanitize, etc.
  middlewares/            # 9 middlewares: auth, security, tenant, error, rate-limit, etc.
  modules/                # 11 feature modules
    auth/                 # Auth routes/controller/service/schema
    doctor/               # Doctor CRUD
    booking/              # Bookings + slots
    availability/         # Availability + exceptions
    guest/                # Guest bookings
    clinical-record/      # EHR + prescriptions + CIE-10
    audit/                # Audit logs
    analytics/            # Dashboard stats, charts data
    billing/              # Invoices, payments, insurance
    laboratory/           # Lab tests, requests, results, PDF
    specialties/          # Specialties CRUD
    saas/                 # Plans, subscriptions, features
    super-admin/          # Global admin, tenants, analytics
  seed/                   # Default tenant, superadmin, test data
  jobs/                   # Cron jobs (reminders, audit integrity)
```

### Middleware Pipeline (orden de ejecución)
1. `securityMiddleware` (Helmet + HPP + Permissions-Policy)
2. `compression` (gzip)
3. `cors` (whitelist localhost:5173 + FRONTEND_URL)
4. `cookieParser`
5. `express.json` (límite 100KB)
6. `optionalAuth` (extrae JWT si existe, sin rechazar)
7. `tenantMiddleware` (resuelve tenant desde header X-Tenant-Id o JWT)
8. `trackActivity` (actualiza `last_activity_at`)
9. `requestLogger` (log por request)
10. `globalLimiter` (500 req/15min)
11. `authLimiter` (10 req/15min en `/api/auth`)
12. `notFoundHandler` + `errorHandler`

### Autenticación
- **JWT HS256**: Access token (15 min) + Refresh token (30 días, SHA256 en DB)
- **2FA/TOTP**: Secreto cifrado con AES-256-GCM, verificación timing-safe
- **reCAPTCHA**: Opcional en login
- **Bloqueo**: 5 intentos fallidos = 15 min de bloqueo
- **Token versioning**: Cambio de password invalida todos los tokens
- **CSRF**: SameSite=lax + CORS whitelist + header `Authorization` (no solo cookies)

### Multi-tenancy
- **Modelo**: Base de datos compartida, tablas con `tenant_id`
- **Resolución**: Header `X-Tenant-Id` o claim del JWT
- **Registro**: Caché in-memory de inquilinos
- **Aislamiento**: Toda query incluye `WHERE tenant_id = $N`

### Roles de Usuario
`s'uperadmin` | `admin` | `doctor` | `lab_technician` | `patient` | `guest` | `user`

### Rate Limiters
| Limiter | Ventana | Máximo |
|---------|---------|--------|
| Global | 15 min | 500 |
| Auth | 15 min | 10 |
| PHI Write | 15 min | 30 |
| Guest Booking | 1 hora | 5 |
| RUT Lookup | 15 min | 3 |
| Onboard | 1 hora | 3 |

### Validación
**Zod v4** con factory middleware `validateZod(schema, source)` — reemplaza `req.body/params/query` con dato parseado.

### Servicios Compartidos
| Servicio | Propósito |
|----------|-----------|
| `db.ts` | Pool PostgreSQL (max 25), read replica opcional, SSL en producción |
| `jwt.service.ts` | Firma/verificación JWT HS256 |
| `crypto.service.ts` | AES-256-GCM para secrets 2FA, SHA256 para tokens |
| `email.service.ts` | Multi-proveedor: SendGrid > SMTP > Log |
| `multi-tenant.service.ts` | Caché in-memory de inquilinos |
| `stripe.service.ts` | Stripe stub (sin key real configurada) |
| `queue.service.ts` | Cola in-memory para emails async |
| `i18n.service.ts` | Traducciones server-side (es/en/pt) |
| `sanitize.ts` | Stripping HTML, redacción de campos sensibles |
| `rut.ts` | Validación/formateo de RUT chileno |
| `sentry.service.ts` | Sentry.io opcional |

### Seguridad en Startup
- Valida longitud mínima de JWT_SECRET, AUDIT_HMAC_SECRET, ENCRYPTION_KEY
- Verifica configuración de email
- Conexión a DB con retry (10 intentos, backoff exponencial)

---

## 🎨 Frontend (`frontend/`)

### Stack
- **React 19** + **TypeScript 6** (strict: false)
- **Vite 8** + React plugin
- **react-router-dom v7** con lazy loading
- **Axios** con interceptors (CSRF, tenant, refresh automático)
- **Sin librería de estado** (solo React Context)
- **Sin framework CSS** (CSS custom con variables)
- **Sin librería de componentes** (todo custom)

### Estructura
```
frontend/src/
  main.tsx              # Entry: Providers > BrowserRouter > App
  App.tsx               # ErrorBoundary + AppRoutes
  index.css             # ~16K líneas, CSS variables, temas, responsivo
  api/                  # 9 módulos Axios
    axios.js            # Instancia con interceptores globales
    bookings.js, doctors.js, availability.js, clinicalRecords.js,
    exceptions.js, laboratory.js, saas.js, specialties.js, super-admin.js
  context/              # 3 Context providers
    AuthContext.tsx      # Auth state + login/logout/register + 2FA
    ThemeContext.tsx     # Tema claro/oscuro con persistencia localStorage
    FeatureContext.tsx   # Feature flags SaaS
  components/           # 10 componentes compartidos
    Navbar.tsx           # Navegación principal con roles, locale switcher, theme toggle
    ErrorBoundary.tsx    # Class component, captura errores de render
    LoadingState.tsx     # Spinner + mensaje
    ErrorState.tsx       # Error con botón de retry
    EmptyState.tsx       # Estado vacío
    CoreModal.jsx        # Modal reutilizable (ESC + click outside)
    Combobox.tsx         # Autocompletado con teclado
    WithFeature.tsx      # HOC para feature gating
    PremiumLocked.tsx    # Placeholder de funcionalidad premium
    CreateTenantModal.tsx # Modal super admin
  pages/                # 30 páginas
    HomePage, LoginPage, RegisterPage, BookingPage, SpecialistsPage,
    ConfirmPage, MyBookingsPage, MyMedicalHistoryPage, MyMedicalHistoryDetailPage,
    MyLabResultsPage, LabResultDetailPage, DoctorPanel, DoctorAvailabilityPage,
    DoctorCalendarPage, DoctorClinicalRecordsPage, DoctorPatientHistoryPage,
    DoctorLabResultsPage, RegisterDoctorPage, AnalyticsPage, AnalyticsCharts,
    AdminSpecialtiesPage, AdminLabTestsPage, AdminLabRequestsPage,
    AdminMedicalHistoryPage, AdminDemoDataPage, LabTechnicianDashboardPage,
    SuperAdminDashboardPage, SuperAdminTenantsPage, SuperAdminTenantDetailPage,
    SuperAdminDemoDataPage
  routes/
    AppRoutes.tsx       # 26+ rutas lazy-loaded con roles
    ProtectedRoute.tsx  # Guard de autenticación y roles
  i18n/
    useI18n.js          # Hook personalizado
    translations.js     # ~56K líneas, 4 idiomas
  utils/
    logger.js           # Log solo en dev
    error-sanitizer.js  # Sanitiza errores (SQL injection, paths)
    rut.js              # Validación RUT chileno
```

### Routing y Roles
| Ruta | Rol | Componente |
|------|-----|------------|
| `/` | Público | HomePage |
| `/login` | Público | LoginPage (con TOTP) |
| `/register` | Público | RegisterPage |
| `/booking` | Público | BookingPage |
| `/specialists` | Público | SpecialistsPage |
| `/confirm/:token` | Público | ConfirmPage |
| `/my-bookings` | user/patient | MyBookingsPage |
| `/my-medical-history` | user/patient | MyMedicalHistoryPage |
| `/my-lab-results` | user/patient | MyLabResultsPage |
| `/doctor/*` | doctor | DoctorPanel, Calendar, ClinicalRecords, etc. |
| `/admin/*` | admin | RegisterDoctor, Analytics, Specialties, etc. |
| `/lab/*` | lab_technician | LabTechnicianDashboard, LabRequests |
| `/super-admin/*` | superadmin | Dashboard, Tenants, etc. |

### Manejo de Estado (Context)
- **Auth**: `user`, `login()`, `logout()`, `register()` — almacena en `localStorage('user')`
- **Theme**: `theme` (light/dark), `toggleTheme()` — persistencia en `localStorage('theme')`
- **Feature**: `features`, `hasFeature(key)` — carga desde API `/api/saas/features`
- **I18n**: `t(key)`, `locale`, `setLocale()` — 4 idiomas, persistencia en `localStorage('app_locale')`

### API Layer (Axios)
- Base URL: `VITE_API_URL` (local: `/api`, CI: `/api/v1`)
- `withCredentials: true`
- **Request interceptor**: adjunta `X-Tenant-Id` y `X-CSRF-Token`
- **Response interceptor**: extrae CSRF token, unwrap `{ data, pagination }`, refresh automático en 401/TOKEN_EXPIRED
- Evento `auth:expired` en 401 fallido

### Estilos
- CSS Variables en `:root` y `[data-theme="dark"]`
- Tema claro/oscuro completo
- Diseño responsivo con media queries
- `components/ui.css` + `components/Modal.css`
- Sin Tailwind, Bootstrap, ni CSS-in-JS

### Testing
- **Framework**: Vitest 4 (backend) + Vitest 4 con jsdom (frontend)
- **Librerías**: @testing-library/react + jest-dom
- **Estado**: 1330 tests backend (89 archivos, ~92% líneas) + 1211 tests frontend (177 archivos, ~85% líneas) — todos pasando

---

## 🗄️ Base de Datos

### Motor
- **PostgreSQL 15** vía `pg` (node-postgres), sin ORM
- Pool: max 25 conexiones, SSL en producción, read replica opcional
- Migraciones: SQL secuenciales en `db/migrations/`

### Tablas Principales (27)
| Tabla | Propósito |
|-------|-----------|
| `tenants` | Inquilinos multi-tenant |
| `users` | Usuarios con roles (7 roles) |
| `doctors` | Perfiles de doctores |
| `bookings` | Reservas con soporte para invitados |
| `doctor_availability` | Disponibilidad semanal recurrente |
| `doctor_exceptions` | Excepciones puntuales |
| `clinical_records` | Historias clínicas (formato SOAP) |
| `prescriptions` | Recetas médicas |
| `cie10_catalog` | Catálogo CIE-10 |
| `audit_logs` | Traza de auditoría encadenada con HMAC |
| `invoices` | Facturación |
| `lab_tests` | Catálogo de exámenes |
| `lab_requests` | Solicitudes de laboratorio |
| `lab_request_items` | Items de cada solicitud |
| `plans` | Planes SaaS (4 planes) |
| `subscriptions` | Suscripciones por tenant |

### Seguridad en DB
- CHECK constraints en todos los enums
- UNIQUE constraints (tenant_id, email) en users y doctors
- `audit_logs` con cadena HMAC-SHA256 (verificable cada 6h)
- Secrets 2FA cifrados con AES-256-GCM
- bcrypt 12 rounds para passwords
- Lockout tras 5 intentos fallidos

---

## 🐳 DevOps

### Docker
- **Dockerfile**: Multi-stage (builder + runner), non-root user, health check
- **Docker Compose**: db (PostgreSQL 15) + backend + frontend
- Volumen persistente `db_data` para PostgreSQL

### CI/CD (GitHub Actions)
- **Triggers**: push/PR a master/main
- **Jobs**: typecheck → test (coverage) → build-backend + build-frontend → deploy (Render)
- **Deploy**: Webhook a Render + health check loop (30 retries)

### Monitoreo
- **Winston**: Logger JSON con niveles configurables
- **Sentry**: Error tracking opcional
- **Health check**: `/health` con DB, Stripe, memoria
- **PM2**: Gestión de procesos con auto-restart
- **Clinic.js**: Profiling (Doctor, Flame, Heap)
- **Audit integrity job**: Cada 6h verifica cadena HMAC de auditoría

---

## 🤖 Machine Learning
- Modelo de demanda predictiva (`ml_demand_forecast`)
- Seed data con 14 días de forecast
- Referenciado en seed pero **sin CREATE TABLE en migraciones** (gap)

---

## 🔒 Seguridad General

| Capa | Mecanismo |
|------|-----------|
| Transporte | HTTPS en producción, HSTS |
| HTTP | Helmet (CSP, frameguard, no sniff, etc.), HPP |
| Auth | JWT + refresh tokens + 2FA TOTP + reCAPTCHA |
| API | Rate limiting (6 niveles), CORS whitelist, body 100KB |
| DB | SQL parametrizado, tenant isolation row-level, CHECK constraints |
| Datos | AES-256-GCM para secrets, bcrypt para passwords, sanitize-html |
| Auditoría | HMAC-SHA256 encadenado, verificación periódica |
| Sesión | Token versioning, inactivity timeout 30min, lockout 5 intentos |

---

## Métricas del Proyecto

| Métrica | Valor |
|---------|-------|
| Archivos backend | ~86 |
| Archivos frontend | ~50+ |
| Endpoints de API | ~130+ |
| Componentes/Páginas frontend | 30 páginas + 10 componentes |
| Roles de usuario | 7 |
| Tablas en DB | 27 |
| Migraciones | 2 |
| Planes SaaS | 4 |
| Idiomas | 4 |
| Pruebas | 2,176 backend + 23 frontend |
| Versión Node | 20.x |
| Versión React | 19 |
| Versión PostgreSQL | 15 |

---

## Relacionados

- [[Wiki|Volver al índice principal]]
- [[03-FRONTEND/Frontend|Frontend]]
- [[02-BACKEND/Backend|Backend]]
- [[04-BASE-DE-DATOS/BaseDeDatos|Base de Datos]]
- [[05-DEVOPS/DevOps|DevOps]]
- [[07-SEGURIDAD/Seguridad|Seguridad]]

---

Tags: #sistema #arquitectura #resumen #completo
