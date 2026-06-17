# Clínica Salud Vital

Sistema SaaS de gestión clínica multi-tenant para administrar clínicas, pacientes, médicos, citas, historiales clínicos, facturación, laboratorio y análisis.

---

## Características

- **Autenticación**: JWT (15 min) + refresh tokens (30 días) con rotación, bcrypt (12 rounds), 2FA TOTP
- **RBAC**: Roles `superadmin`, `admin`, `doctor`, `patient` con autorización por middleware
- **Agenda médica**: Creación, cancelación, slots disponibles, disponibilidad semanal del doctor, excepciones (días completos/parciales)
- **Reserva como invitado**: Booking sin login mediante RUT chileno
- **Historia Clínica Electrónica (EHR)**: Registros clínicos SOAP, recetas/prescripciones, búsqueda CIE-10, descarga PDF
- **Facturación**: Facturas, pagos, seguros, integración Stripe (con stub en desarrollo)
- **Laboratorio**: Catálogo de exámenes, solicitudes, resultados
- **Dashboard analítico**: KPIs, gráficos (Recharts), pronóstico de demanda, tendencias, distribución geográfica
- **Auditoría**: Logs encadenados con HMAC-SHA256, verificación periódica de integridad
- **Webhooks**: Endpoint Stripe para eventos de suscripción
- **Notificaciones**: Email (SendGrid + SMTP fallback Gmail), SMS/WhatsApp (Twilio), recordatorios automáticos cada 5 min
- **Multi-tenancy**: Base de datos compartida, resolución por header `X-Tenant-Id` o JWT, planes SaaS con límites
- **Internacionalización**: 4 idiomas (es/en completos, pt/fr parciales), ~478 claves de traducción
- **Seguridad**: Helmet (CSP, HSTS, frameguard), HPP, CORS, rate limiting (3 niveles), validación Zod, sanitize-html, Sentry, advisory locks PostgreSQL

---

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | React 19, Vite 8, TypeScript, React Router 7, FullCalendar 6, Recharts 3, Axios |
| Backend | Express 4, TypeScript 5.8, Zod 4, node-cron, Winston |
| Base de datos | PostgreSQL 15, pg (raw SQL), pool con replicación lectura |
| Infraestructura | Docker Compose, Render, Ubuntu |
| CI/CD | GitHub Actions (typecheck, test, build, deploy) |
| Monitoreo | Sentry, logs estructurados Winston |
| Email | SendGrid, nodemailer (Gmail SMTP) |
| SMS | Twilio (SMS + WhatsApp) |
| Pagos | Stripe (con stub simulado en desarrollo) |

---

## Arquitectura

```
                     ┌──────────────┐
                     │   React 19   │
                     │   Frontend   │
                     │  :5173 (dev) │
                     └──────┬───────┘
                            │ /api
                     ┌──────▼───────┐
                     │  Express 4   │
                     │   Backend    │
                     │   :3000      │
                     └──────┬───────┘
                            │ SQL
                     ┌──────▼───────┐
                     │ PostgreSQL   │
                     │     15       │
                     └──────────────┘
```

El proyecto sigue un patrón **monolito modular**: un solo deploy con módulos débilmente acoplados dentro de `src/modules/`. Cada módulo contiene sus propias rutas, controladores, servicios y esquemas de validación.

---

## Estructura del proyecto

```
├── src/
│   ├── app.ts                    # Entry point, middlewares, rutas
│   ├── modules/
│   │   ├── auth/                 # Registro, login, refresh, 2FA, cambio password
│   │   ├── doctor/               # CRUD doctores, invitación, toggle activo
│   │   ├── booking/              # Reservas, slots disponibles, agenda doctor
│   │   ├── availability/         # Disponibilidad semanal + excepciones
│   │   ├── guest/                # Booking sin login por RUT
│   │   ├── clinical-record/      # EHR, recetas, CIE-10, PDF
│   │   ├── billing/              # Facturas, pagos, seguros
│   │   ├── laboratory/           # Tests, solicitudes, resultados
│   │   ├── analytics/            # Dashboard, KPIs, pronóstico
│   │   ├── audit/                # Logs de auditoría
│   │   ├── specialties/          # Catálogo de especialidades
│   │   ├── saas/                 # Planes, suscripciones, onboarding, Stripe webhook
│   │   ├── super-admin/          # Panel global: tenants, usuarios, estadísticas
│   │   └── patient/              # (vacío)
│   ├── middlewares/
│   │   ├── auth.middleware.ts    # JWT verification + role authorization
│   │   ├── tenant.middleware.ts  # Resolución multi-tenant
│   │   ├── security.middleware.ts# Helmet, HPP, CSP
│   │   ├── validate.middleware.ts# Validación Zod
│   │   ├── errorHandler.middleware.ts
│   │   ├── requestLogger.middleware.ts
│   │   ├── sessionActivity.middleware.ts
│   │   └── asyncHandler.middleware.ts
│   ├── shared/                   # DB pool, JWT, crypto, email, queue, i18n, RUT, etc.
│   ├── jobs/
│   │   ├── reminder.job.ts      # Recordatorios cada 5 min
│   │   └── audit-integrity.job.ts# Verificación cadena auditoría cada 6h
│   ├── seed/
│   │   ├── admin.seed.ts        # Tenant default + superadmin
│   │   └── seed.ts              # Datos de prueba realistas
│   └── types/                    # Tipos globales + express.d.ts
├── frontend/
│   └── src/
│       ├── pages/               # 18 páginas (públicas, doctor, admin, superadmin)
│       ├── components/          # Navbar, LoadingState, ErrorState, EmptyState, Combobox
│       ├── context/             # AuthContext, ThemeContext
│       ├── i18n/                # Traducciones es/en/pt/fr
│       ├── api/                 # Clientes Axios por módulo
│       └── routes/              # AppRoutes + ProtectedRoute
├── db/
│   └── init.sql                 # Schema inicial (12 tablas, índices, triggers, seed data)
├── docker-compose.yml           # PostgreSQL 15
├── Dockerfile                   # Build + deploy backend
├── render.yaml                  # Configuración deploy Render
└── .env.example                 # Variables de entorno
```

---

## Instalación rápida

```bash
git clone <repo> && cd clinic-backend
npm install
docker compose up -d db
cp .env.example .env
npm run dev
```

Frontend en `http://localhost:5173`, API en `http://localhost:3000`.

### Scripts disponibles

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo (tsx watch) |
| `npm start` | Producción (node dist/app.js) |
| `npm test` | Tests + cobertura |
| `npm run typecheck` | TypeScript check |
| `npm run build` | Compilar TS + construir frontend |

---

## Variables de entorno

| Variable | Requerida | Descripción |
|----------|-----------|-------------|
| `DATABASE_URL` | Sí | PostgreSQL connection string |
| `JWT_SECRET` | Sí | Secreto JWT (mín. 32 caracteres) |
| `AUDIT_HMAC_SECRET` | Sí | Secreto HMAC para integridad de auditoría (mín. 32) |
| `PHI_MASTER_KEY` | Sí | Clave para cifrado de datos clínicos (64 hex) |
| `ENCRYPTION_KEY` | Sí | Clave cifrado 2FA (32 hex) |
| `FRONTEND_URL` | Sí | URL del frontend para CORS |
| `NODE_ENV` | No | `development` por defecto |
| `PORT` | No | 3000 por defecto |
| `EMAIL_USER` | No | Gmail SMTP user |
| `EMAIL_PASS` | No | Gmail SMTP app password |
| `SENDGRID_API_KEY` | No | API key SendGrid |
| `TWILIO_*` | No | Credenciales Twilio (SMS/WhatsApp) |
| `STRIPE_SECRET_KEY` | No | Stripe (modo simulado sin ella) |
| `RECAPTCHA_SECRET_KEY` | No | Google reCAPTCHA |
| `SENTRY_DSN` | No | Error tracking |
| `ML_SIMPLIFIED` | No | `true` para modo stats sin TF.js |
| `LOG_LEVEL` | No | `info` por defecto |

Ver `.env.example` para la lista completa con valores por defecto.

---

## Testing

```bash
npm test                          # 1122+ tests, cobertura
npm run test:watch                # Modo watch
npm run test:coverage             # Reporte HTML
```

- **Framework**: Vitest 4 con pool forks
- **Setup**: tests/setup.js con mocks de DB, auth, email
- **Cobertura**: ~89% lines (threshold: 50%)
- **Estructura**: 53 tests unitarios, 7 de integración, 93 archivos
- **CI**: GitHub Actions ejecuta typecheck + test + build en cada push a master/main

---

## Seguridad

- **Helmet**: CSP (Google reCAPTCHA + fonts), HSTS preload, frameguard deny, permisos restringidos
- **HPP**: Protección contra HTTP Parameter Pollution
- **CORS**: Solo origen configurado en `FRONTEND_URL`
- **Rate limiting**: Global (500/15 min), Auth (10/15 min), PHI (30/15 min), Guest (5/hora), SaaS (3/hora)
- **Validación**: Zod 4 en todas las entradas (body, params, query)
- **Sanitización**: sanitize-html para campos clínicos, redacción de campos sensibles en logs
- **JWT**: HS256, 15 min de expiración, versionados para revocación
- **Refresh tokens**: 30 días, rotación, almacenados en DB, revocables
- **2FA**: TOTP con secreto cifrado AES-256-GCM
- **Advisory locks**: PostgreSQL para evitar condiciones de carrera en creación de reservas
- **Auditoría**: Logs encadenados con HMAC-SHA256, verificación de integridad cada 6 horas
- **Sentry**: Captura de errores no manejados en producción

---

## Multi-tenancy

- Modelo de base de datos compartida con columna `tenant_id` en todas las tablas
- Resolución automática via header `X-Tenant-Id` o desde el JWT del usuario
- Middleware inyecta `req.tenant_id` y `req.locale`
- Helpers `tenantQuery` filtran automáticamente por tenant
- Planes SaaS: `free`, `basic`, `pro`, `enterprise` con límites configurables
- Self-service: onboarding, checkout Stripe, cambio de plan, cancelación

---

## API

La API REST usa el prefijo `/api` (no versionado explícitamente).

**Convenciones**:
- Formato respuesta: `{ data, pagination }` para listas, objeto directo para individual
- Paginación: `?page=1&limit=20` (máx. 100)
- Autenticación: `Authorization: Bearer <token>`
- Multi-tenancy: header `X-Tenant-Id`
- Roles: `superadmin`, `admin`, `doctor`, `patient`

**Módulos principales**:

| Módulo | Prefijo | Endpoints clave |
|--------|---------|-----------------|
| Auth | `/api/auth` | register, login, refresh, logout, 2FA, change-password, forgot/reset password |
| Doctors | `/api/doctors` | CRUD, listar (público), invitar, toggle activo |
| Bookings | `/api/bookings` | CRUD, available-slots, daily-density, agenda doctor |
| Availability | `/api/availability` | CRUD disponibilidad semanal |
| Exceptions | `/api/exceptions` | CRUD excepciones (full/partial day) |
| Guest | `/api/guest` | Booking sin login, lookup por RUT |
| Clinical Records | `/api/clinical-records` | EHR, CIE-10 search, prescriptions, PDF |
| Billing | `/api/billing` | Facturas, stats, seguros |
| Laboratory | `/api/laboratory` | Tests, solicitudes, resultados |
| Analytics | `/api/analytics` | Dashboard, no-shows, demanda, tendencias, signos vitales |
| Audit | `/api/audit` | Logs de auditoría (admin) |
| Specialties | `/api/specialties` | Catálogo público |
| SaaS | `/api/saas` | Planes, onboarding, Stripe webhook, suscripción, uso |
| Super Admin | `/api/super-admin` | Tenants, usuarios globales, estadísticas |

---

## Despliegue

### Docker Compose (desarrollo)

```bash
docker compose up -d db
npm run dev
```

### Docker (producción)

```bash
npm run build
docker build -t clinic-api .
docker run -p 3000:3000 --env-file .env clinic-api
```

### Render (cloud)

El archivo `render.yaml` contiene la configuración para deploy automatizado. GitHub Actions despliega automáticamente al hacer push a `master`:

1. TypeScript check
2. Tests + cobertura
3. Build backend + frontend
4. Deploy a Render via webhook
5. Health check post-deploy

---

## Usuarios de prueba (seed)

| Rol | Email | Password |
|-----|-------|----------|
| Super Admin | superadmin@clinic.com | REPLACED_PASSWORD |
| Admin | admin@clinic.com | REPLACED_PASSWORD |
| Doctor | juan@clinic.com | REPLACED_PASSWORD |
| Patient | user1@clinic.com | REPLACED_PASSWORD |

Ejecutar seed automático al iniciar la app en desarrollo.

---

## Estado del proyecto

**Versión**: 1.0.0 — Producción

| Aspecto | Estado |
|---------|--------|
| Backend tests | 1122+ tests, ~89% cobertura |
| Frontend | 18 páginas, lazy loading, tema claro/oscuro |
| Documentación API | docs/api/overview.md |
| ADR | docs/adr/001-monolito-modular.md |
| CI/CD | GitHub Actions + Render |
| Seguridad | Helmet, CORS, rate limiting, Zod, 2FA, auditoría |
| Multi-tenancy | Implementado con planes SaaS |
| i18n | es/en completos, pt/fr parcial |

