<div align="center">

# 🏥 Clínica Salud Vital

**SaaS de Gestión Clínica Multi-Tenant**  
Plataforma integral para administrar clínicas, pacientes, médicos, citas, historiales clínicos, facturación, laboratorio y análisis.

<br>

[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![Express](https://img.shields.io/badge/Express-4-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)](https://vite.dev/)
[![Vitest](https://img.shields.io/badge/Vitest-4-6E9F18?logo=vitest&logoColor=white)](https://vitest.dev/)
[![Zod](https://img.shields.io/badge/Zod-4-3E67B1?logo=zod&logoColor=white)](https://zod.dev/)
[![Render](https://img.shields.io/badge/Render-46E3B7?logo=render&logoColor=white)](https://render.com/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)
[![CI](https://img.shields.io/github/actions/workflow/status/bentlyy/Clinica-Salud-Vital/ci.yml?branch=master&label=CI&logo=githubactions)](https://github.com/bentlyy/Clinica-Salud-Vital/actions)
[![Tests](https://img.shields.io/badge/tests-1128%20passing-2ea043)](#-testing)
[![Coverage](https://img.shields.io/badge/coverage-~85%25-2ea043)](#-testing)
[![Audit](https://img.shields.io/badge/audit-2026--07--29-FF6B6B)](#-auditor%C3%ADa-y-mejora)

</div>

---

## ✨ Funcionalidades

<details open>
<summary><b>🔐 Autenticación y Seguridad</b></summary>

- JWT (15 min) + Refresh Tokens (30 días) con rotación
- 2FA TOTP con secreto cifrado AES-256-GCM
- bcrypt (12 rounds) para passwords
- Rate limiting en 5 niveles: global, auth, PHI, guest, SaaS
- Helmet (CSP, HSTS preload, frameguard), HPP, CORS
- Validación Zod 4 en todas las entradas
- Sanitización de campos clínicos con `sanitize-html`
- Auditoría encadenada con HMAC-SHA256 + verificación cada 6h
- Advisory locks PostgreSQL para carrera crítica en reservas
- Captura de errores con Sentry

</details>

<details open>
<summary><b>👥 Roles y Multi-tenancy</b></summary>

| Rol | Acceso |
|-----|--------|
| `superadmin` | Panel global: todos los tenants, usuarios, estadísticas |
| `admin` | Gestión completa de su clínica |
| `doctor` | Agenda, pacientes, historiales clínicos |
| `patient` | Sus propias citas y registros |

Base de datos compartida con columna `tenant_id` en todas las tablas. Resolución automática via header `X-Tenant-Id` o JWT. Planes SaaS (`free`, `basic`, `pro`, `enterprise`) con límites configurables y self-service (onboarding, Stripe checkout, cambio de plan, cancelación).

</details>

<details open>
<summary><b>📋 Módulos del Sistema</b></summary>

| Módulo | Descripción |
|--------|------------|
| **Auth** | Registro, login, refresh, logout, 2FA, cambio/recuperación de password |
| **Doctors** | CRUD, listado público, invitación por email, toggle activo |
| **Booking** | Creación/cancelación de citas, slots disponibles, densidad diaria, agenda del doctor |
| **Availability** | Disponibilidad semanal + excepciones (días completos o parciales) |
| **Guest** | Reserva sin login mediante RUT chileno |
| **Clinical Records** | Historia clínica electrónica (SOAP), recetas/prescripciones, búsqueda CIE-10, descarga PDF |
| **Billing** | Facturas, pagos, seguros, integración Stripe |
| **Laboratory** | Catálogo de exámenes, solicitudes, resultados, muestras, QC, equipos, reactivos |
| **Analytics** | Dashboard con KPIs, gráficos Recharts, pronóstico de demanda, tendencias |
| **Audit** | Logs de auditoría encadenados con verificación de integridad |
| **Specialties** | Catálogo público de especialidades |
| **SaaS** | Planes, onboarding multi-tenant, webhook Stripe, suscripción, uso, límites |
| **Super Admin** | Panel global: gestión de tenants, usuarios, estadísticas del sistema |
| **Medical History** | Historial clínico por paciente |
| **Reports** | Generación de reportes (citas, revenue, pacientes, laboratorio) |

</details>

<details open>
<summary><b>🌐 Internacionalización</b></summary>

| Idioma | Estado | Claves |
|--------|--------|-------|
| 🇪🇸 Español | Completo | ~811 |
| 🇺🇸 Inglés | Completo | ~811 |
| 🇧🇷 Portugués | Completo | ~811 |
| 🇫🇷 Francés | Completo | ~811 |

</details>

<details open>
<summary><b>📬 Notificaciones</b></summary>

- Email transaccional (SendGrid + fallback Gmail SMTP)
- SMS / WhatsApp (Twilio)
- Recordatorios automáticos de citas cada 5 minutos via job interno

</details>

---

## 🧱 Stack Tecnológico

<div align="center">

| Capa | Tecnologías |
|------|-------------|
| <b>Frontend</b> | React 19, Vite 8, TypeScript 5.8, React Router 7, FullCalendar 6, Recharts 3, Axios |
| <b>Backend</b> | Express 4, TypeScript 5.8, Zod 4, node-cron, Winston |
| <b>Base de datos</b> | PostgreSQL 15, pg (raw SQL) con pool y replicación de lectura |
| <b>Infraestructura</b> | Docker Compose, Render (cloud), Ubuntu |
| <b>CI/CD</b> | GitHub Actions — typecheck, test, build, deploy automático a Render |
| <b>Monitoreo</b> | Sentry, logs estructurados Winston |
| <b>Email</b> | SendGrid + Nodemailer (Gmail SMTP) |
| <b>SMS</b> | Twilio (SMS + WhatsApp) |
| <b>Pagos</b> | Stripe (con stub simulado en desarrollo) |

</div>

---

## 🏗️ Arquitectura

El proyecto sigue un patrón **monolito modular**: un solo deploy con módulos débilmente acoplados dentro de `src/modules/`. Cada módulo contiene rutas, controladores, servicios y esquemas de validación propios.

```
                    ┌─────────────────────────┐
                    │      React 19 SPA        │
                    │      Frontend :5173       │
                    └──────────┬──────────────┘
                               │  /api
                    ┌──────────▼──────────────┐
                    │    Express 4 API         │
                    │    Backend :3000          │
                    │                          │
                    │  ┌─ auth ─ booking ─┐   │
                    │  │ doctor clinical  │   │
                    │  │ billing  lab     │   │
                    │  │ analytics  saas  │   │
                    │  │ super-admin      │   │
                    │  └──────────────────┘   │
                    └──────────┬──────────────┘
                               │  SQL
                    ┌──────────▼──────────────┐
                    │    PostgreSQL 15         │
                    │    (shared-db multi-     │
                    │     tenant con tenant_id)│
                    └─────────────────────────┘
```

---

## 📁 Estructura del Proyecto

```
├── src/                           # Backend
│   ├── app.ts                     # Entry point, middlewares globales, rutas
│   ├── modules/
│   │   ├── auth/                  # Autenticación, 2FA, recuperación
│   │   ├── doctor/                # CRUD doctores, invitaciones
│   │   ├── booking/               # Reservas, slots, agenda
│   │   ├── availability/          # Disponibilidad semanal + excepciones
│   │   ├── guest/                 # Booking invitado por RUT
│   │   ├── clinical-record/       # EHR, recetas, CIE-10, PDF
│   │   ├── billing/               # Facturación, pagos, seguros
│   │   ├── laboratory/            # Exámenes, solicitudes, resultados
│   │   ├── analytics/             # Dashboard, KPIs, pronóstico
│   │   ├── audit/                 # Logs de auditoría
│   │   ├── specialties/           # Catálogo de especialidades
│   │   ├── saas/                  # Planes, suscripciones, onboarding
│   │   ├── super-admin/           # Panel global multi-tenant
│   │   ├── medical-history/       # Historial clínico por paciente
│   │   └── reports/               # Generación de reportes
│   ├── middlewares/               # auth, tenant, security, validate, errorHandler, etc.
│   ├── shared/                    # DB pool, JWT, crypto, email, queue, i18n, RUT
│   ├── jobs/                      # recordatorios (5min), auditoría (6h)
│   ├── seed/                      # Seed datos de prueba
│   └── types/                     # Definiciones globales TypeScript
├── frontend/                      # Frontend React + Vite (consolidado)
│   └── src/
│       ├── modules/               # Módulos por dominio (auth, bookings, doctors, etc.)
│       ├── shared/                # Componentes compartidos, providers, utils
│       ├── test/                  # Tests frontend
│       ├── i18n/                  # Traducciones (es, en)
│       └── main.tsx               # Entry point
├── db/
│   ├── init.sql                   # Schema completo + índices + triggers + seed
│   └── migrations/                # Migraciones SQL (8 archivos)
├── docker-compose.yml             # PostgreSQL 15 + Backend + Frontend (dev)
├── docker-compose.prod.yml        # Backend + Frontend (producción)
├── Dockerfile                     # Build + deploy backend
├── render.yaml                    # Config Render
└── .env.example                   # Template variables de entorno
```

---

## 🚀 Inicio Rápido

```bash
# 1. Clonar e instalar
git clone https://github.com/bentlyy/Clinica-Salud-Vital.git
cd Clinica-Salud-Vital
npm install

# 2. Base de datos (PostgreSQL 15)
docker compose up -d db

# 3. Variables de entorno
cp .env.example .env
# Editar .env con tus credenciales

# 4. Iniciar desarrollo
npm run dev
```

Frontend en [`http://localhost:5173`](http://localhost:5173), API en [`http://localhost:3000`](http://localhost:3000).

### Scripts Disponibles

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo con hot-reload (tsx watch) |
| `npm start` | Producción (`node dist/app.js`) |
| `npm test` | Tests con cobertura (Vitest) |
| `npm run typecheck` | Verificación TypeScript |
| `npm run build:backend` | Compilar TypeScript |
| `npm run build:frontend` | Build frontend React |
| `npm run build` | Build completo (backend + frontend) |

---

## 🔌 API

La API REST usa el prefijo `/api`. Las respuestas siguen el formato `{ data, pagination }` para listas y objeto directo para recursos individuales.

### Convenciones

| Aspecto | Formato |
|---------|---------|
| **Autenticación** | `Authorization: Bearer <jwt>` |
| **Multi-tenancy** | Header `X-Tenant-Id` o desde el JWT |
| **Paginación** | `?page=1&limit=20` (máx. 100) |
| **Roles** | `superadmin`, `admin`, `doctor`, `patient` |

### Endpoints Principales

| Módulo | Prefijo | Propósito |
|--------|---------|-----------|
| Auth | `/api/auth` | register, login, refresh, logout, 2FA, change-password, forgot/reset |
| Doctors | `/api/doctors` | CRUD, listar público, invitar, toggle activo |
| Bookings | `/api/bookings` | CRUD, available-slots, daily-density, agenda |
| Availability | `/api/availability` | Disponibilidad semanal |
| Exceptions | `/api/exceptions` | Excepciones (full/partial day) |
| Guest | `/api/guest` | Booking sin login por RUT |
| Clinical Records | `/api/clinical-records` | EHR, CIE-10, recetas, PDF |
| Billing | `/api/billing` | Facturas, pagos, seguros |
| Laboratory | `/api/laboratory` | Tests, solicitudes, resultados |
| Analytics | `/api/analytics` | Dashboard, KPIs, pronóstico |
| Audit | `/api/audit` | Logs (admin) |
| Specialties | `/api/specialties` | Catálogo público |
| SaaS | `/api/saas` | Planes, onboarding, webhook Stripe, subscription |
| Super Admin | `/api/super-admin` | Tenants, usuarios globales, stats |

---

## 🧪 Testing

```bash
npm test                          # Suite completa (backend)
cd frontend && npm test           # Suite frontend
npm run test:watch                # Modo watch
npm run test:coverage             # Reporte HTML
```

| Métrica | Valor |
|---------|-------|
| **Framework** | Vitest 4 con pool forks |
| **Tests backend** | 1145 passing — 77 archivos |
| **Tests frontend** | ~89 passing — 13 archivos |
| **Cobertura** | ~85% lines (threshold: 70%) |
| **Setup** | Mocks de DB, auth, email, JWT |
| **CI** | GitHub Actions: typecheck → test → build |

---

## 🔒 Seguridad

| Capa | Implementación |
|------|---------------|
| **Headers** | Helmet (CSP con reCAPTCHA + Google Fonts, HSTS preload, frameguard deny) |
| **Validación** | Zod 4 en body, params y query de todos los endpoints |
| **Autenticación** | JWT HS256 (15 min), refresh tokens (30 días con rotación y revocación) |
| **2FA** | TOTP con secreto cifrado AES-256-GCM |
| **Rate Limiting** | Global (500/15min), Auth (10/15min), PHI (30/15min), Guest (5/hora), SaaS (3/hora) |
| **CORS** | Solo orígenes autorizados |
| **Sanitización** | `sanitize-html` en campos clínicos, redacción de datos sensibles en logs |
| **Anti-fraude** | Advisory locks PostgreSQL para condiciones de carrera |
| **Auditoría** | Logs encadenados HMAC-SHA256, verificación de integridad cada 6h |
| **Monitoreo** | Sentry para errores no manejados en producción |

---

## 🐳 Despliegue

### Docker Compose (desarrollo local)

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

El archivo `render.yaml` contiene la configuración. El CI/CD despliega automáticamente al hacer push a `master`:

1. ✅ TypeScript check
2. ✅ Tests + cobertura
3. ✅ Build backend + frontend
4. 🚀 Deploy a Render via webhook
5. 💚 Health check post-deploy

---

## 👤 Usuarios de Prueba (Seed)

| Rol | Email | Password |
|-----|-------|----------|
| 🔷 Super Admin | superadmin@clinic.com | `REPLACED_PASSWORD` |
| 🟢 Admin | admin@clinic.com | `REPLACED_PASSWORD` |
| 🟡 Doctor | juan@clinic.com | `REPLACED_PASSWORD` |
| ⚪ Patient | user1@clinic.com | `REPLACED_PASSWORD` |
| 🔬 Laboratorio | lab@clinic.com | `REPLACED_PASSWORD` |

Los datos de prueba se generan automáticamente al iniciar la app en desarrollo.

---

## 📊 Estado del Proyecto

<div align="center">

| Aspecto | Estado |
|---------|--------|
| **Versión** | `1.0.0` — Producción |
| **Backend** | 1145 passing tests — ~85% cobertura — typecheck sin errores |
| **Frontend** | ~89 passing tests — 35 páginas — 28 componentes — lazy loading — tema claro/oscuro |
| **CI/CD** | GitHub Actions (typecheck + test + build) |
| **Seguridad** | Helmet, CORS, rate limiting, Zod, 2FA, auditoría HMAC |
| **Multi-tenancy** | Implementado con planes SaaS auto-gestionables |
| **i18n** | 🇪🇸 🇺🇸 completos — ~363 claves c/u — pt/fr deprecated |
| **Auditoría** | 2026-07-29 — Score 61/100 — 16 corregidos — Mejoras de seguridad implementadas |
| **Documentación** | API docs, ADR (monolito modular), Wiki Obsidian |
| **Frontend** | Consolidado en `frontend/` (v3) — eliminados v1, v2 y login-options |

</div>

---

<div align="center">

**Hecho con ❤️ para la salud digital**

[Reportar Bug](https://github.com/bentlyy/Clinica-Salud-Vital/issues) · [Solicitar Feature](https://github.com/bentlyy/Clinica-Salud-Vital/issues) · [Ir al Sitio](https://clinica-salud-vital.onrender.com)

</div>
