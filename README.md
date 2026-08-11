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
[![Tests](https://img.shields.io/badge/tests-2541%20passing-2ea043)](#-testing)
[![Coverage](https://img.shields.io/badge/coverage-~90%25-2ea043)](#-testing)
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
| `superadmin` | Panel global SaaS: tenants, usuarios, facturación, especialidades, auditoría y analytics del sistema |
| `admin` | Gestión completa de su clínica (dashboard, clínica, gestión, laboratorio) |
| `doctor` | Agenda, pacientes, fichas clínicas, recetas, laboratorio, analytics y disponibilidad |
| `lab_technician` | Panel completo de laboratorio, analytics y reportes |
| `patient` | Sus propias citas, fichas clínicas, recetas, historial y resultados de laboratorio |
| `guest` / `user` | Sin panel (reserva pública por RUT / mapeado a `patient` en la navegación) |

Base de datos compartida con columna `tenant_id` en todas las tablas. Resolución automática via header `X-Tenant-Id` o JWT. Planes SaaS (`free`, `basic`, `pro`, `enterprise`) con límites configurables y self-service (onboarding, Stripe checkout, cambio de plan, cancelación).

La **barra lateral** se genera dinámicamente según el rol (`getNavItems` en `frontend/src/shared/constants/navigation.tsx`):

| Rol | Secciones en la barra lateral |
|-----|-------------------------------|
| 🔷 `superadmin` | Panel SaaS · Clínicas · Usuarios · Especialidades · Auditoría · Cobros · Configuración |
| 🟢 `admin` | Dashboard · Clínica · Gestión · Laboratorio (panel, solicitudes, catálogo, control de calidad, analytics, resultados) · Configuración |
| 🟡 `doctor` | Dashboard · Clínica · Gestión · Laboratorio (mismo submenú que admin) · Configuración |
| 🔬 `lab_technician` | Dashboard · Laboratorio · Analytics · Reportes · Configuración |
| ⚪ `patient` | Dashboard · Mis Citas · Fichas Clínicas · Recetas · Historial Médico · Mis Resultados de Laboratorio · Configuración |

El submenú **Laboratorio** se bloquea con `featureKey: 'laboratory'` (feature gate por plan SaaS). Los hubs `/clinical` y `/management` agrupan pestañas condicionadas por rol. El paciente usa además un portal con bottom-nav propio (`PatientLayout`).

</details>

<details open>
<summary><b>📋 Módulos del Sistema</b></summary>

| Módulo | Descripción |
|--------|------------|
| **Auth** | Registro, login, refresh, logout, 2FA, cambio/recuperación de password, reset-admin, JWKS |
| **Doctors** | CRUD, listado público, invitación por email, toggle activo, listado de usuarios |
| **Booking** | Creación/cancelación de citas, slots disponibles, densidad diaria, agenda del doctor |
| **Availability** | Disponibilidad semanal + excepciones (días completos o parciales), calendario del doctor |
| **Guest** | Reserva sin login mediante RUT chileno |
| **Clinical Records** | Historia clínica electrónica (SOAP), recetas/prescripciones, búsqueda CIE-10, descarga PDF |
| **Billing** | Facturas, pagos, seguros, integración Stripe |
| **Laboratory** | Catálogo de exámenes, solicitudes, muestras, workflow (recepción→QC→validación→entrega), resultados, equipos, reactivos, QC, dashboard por área y eventos SSE en tiempo real |
| **Analytics** | Dashboard con KPIs, gráficos Recharts, demanda, no-shows, diagnósticos, signos vitales, estadísticas por rol |
| **Audit** | Logs de auditoría encadenados con verificación de integridad |
| **Specialties** | Catálogo público de especialidades |
| **SaaS** | Planes, onboarding multi-tenant, webhook Stripe, suscripción, uso, límites, features |
| **Super Admin** | Panel global: KPIs, tenants, usuarios, billing, analytics (health scores, churn, ocupación, alertas), demo data |
| **Medical History** | Historial clínico y antecedentes por paciente |
| **Reports** | Generación de reportes (citas, revenue, pacientes, laboratorio, doctores) con descarga CSV |
| **Notifications** | Bandeja de notificaciones con filtros, paginación y leído/no leído |
| **Clinical (hub)** | Pestañas de bookings, fichas clínicas, recetas, historial, pacientes y disponibilidad |
| **Management (hub)** | Pestañas de analytics, reportes, auditoría y billing |

</details>

<details open>
<summary><b>🌐 Internacionalización</b></summary>

| Idioma | Estado | Namespaces | Claves |
|--------|--------|------------|--------|
| 🇪🇸 Español | Completo | 65 | 3.079 |
| 🇺🇸 Inglés | Completo (paridad total) | 65 | 3.079 |
| 🇧🇷 Portugués | Completo (paridad total) | 65 | 3.079 |
| 🇫🇷 Francés | Completo (paridad total) | 65 | 3.079 |

Patrón `t('ns:clave')`, `fallbackLng: 'es'`, selector de idioma en la topbar, test automático de paridad de claves (`i18n-keys.test.ts`).

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
├── frontend/                      # Frontend React + Vite (consolidado, único)
│   ├── public/                    # Estáticos (clinicafoto.jpg)
│   └── src/
│       ├── modules/               # Módulos por dominio (auth, bookings, doctors, laboratory, super-admin, clinical, management, notifications, etc.)
│       ├── shared/                # Componentes compartidos, providers, constants (navigation), hooks, utils
│       ├── test/                  # Tests frontend (177 archivos, 1211 tests)
│       ├── i18n/                  # Traducciones (es, en, pt, fr — 65 namespaces)
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
| Auth | `/api/auth` | register, login, refresh, logout, 2FA, change-password, forgot/reset, invite-info, reset-admin, jwks |
| Doctors | `/api/doctors` | CRUD, listar público, invitar, toggle activo, users |
| Bookings | `/api/bookings` | CRUD, available-slots, daily-density, agenda |
| Availability | `/api/availability` | Disponibilidad semanal |
| Exceptions | `/api/availability-exceptions` | Excepciones (full/partial day) |
| Guest | `/api/guest` | Booking sin login por RUT |
| Clinical Records | `/api/clinical-records` | EHR, CIE-10, recetas, PDF |
| Billing | `/api/billing` | Facturas, pagos, seguros, stats |
| Laboratory | `/api/laboratory` | Tests, solicitudes, muestras, QC, equipos, reactivos, eventos SSE |
| Analytics | `/api/analytics` | Dashboard, KPIs, demanda, no-shows, vitals |
| Audit | `/api/audit` | Logs (admin/superadmin) |
| Specialties | `/api/specialties` | Catálogo público |
| SaaS | `/api/saas` | Planes, onboarding, webhook Stripe, subscription, usage, limits |
| Super Admin | `/api/super-admin` | Tenants, usuarios globales, stats, analytics global |
| Medical History | `/api/medical-history` | Historiales por paciente |
| Reports | `/api/reports` | Tipos disponibles, generación y descarga |

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
| **Framework** | Vitest 4 con pool forks (backend) / Vitest 3 (frontend) |
| **Tests backend** | 1330 passing — 89 archivos |
| **Tests frontend** | 1211 passing — 177 archivos |
| **Cobertura** | Backend ~92% lines (threshold: 85%) · Frontend ~85% lines (threshold: 80%) |
| **Setup** | Mocks de DB, auth, email, JWT; storage funcional + i18n en frontend |
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
| **Backend** | 1330 passing tests — ~92% cobertura — typecheck sin errores |
| **Frontend** | 1211 passing tests (177 archivos, suite completa en verde) — ~85% cobertura — ~50 páginas — lazy loading — tema claro/oscuro — sidebar por rol |
| **CI/CD** | GitHub Actions (typecheck + test + build) + deploy a Render |
| **Seguridad** | Helmet, CORS, rate limiting, Zod, 2FA, auditoría HMAC, IDOR fixes, captcha fail-closed |
| **Multi-tenancy** | Implementado con planes SaaS auto-gestionables |
| **i18n** | 🇪🇸 🇺🇸 🇧🇷 🇫🇷 completos — 3.079 claves c/u — paridad total verificada por test |
| **Auditoría** | 2026-07-29 — Score ~75/100 — 30 corregidos — Mejoras de seguridad implementadas · 2026-08-11 suites completas en verde ✅ |
| **Documentación** | API docs, ADR (monolito modular), Wiki Obsidian |
| **Frontend** | Consolidado en `frontend/` (único) — `frontend-v3/` es solo un `node_modules` residual |

</div>

---

<div align="center">

**Hecho con ❤️ para la salud digital**

[Reportar Bug](https://github.com/bentlyy/Clinica-Salud-Vital/issues) · [Solicitar Feature](https://github.com/bentlyy/Clinica-Salud-Vital/issues) · [Ir al Sitio](https://clinica-salud-vital.onrender.com)

</div>
