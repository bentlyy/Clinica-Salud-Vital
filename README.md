<div align="center">

# 🏥 Vitaria

**Gestión clínica simple, centralizada y escalable**

Vitaria es una plataforma SaaS orientada a centros de salud, consultas y profesionales que necesitan centralizar la gestión de sus operaciones en un solo lugar.

<br>

[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![Express](https://img.shields.io/badge/Express-4-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)](https://vite.dev/)
[![Vitest](https://img.shields.io/badge/Vitest-4-6E9F18?logo=vitest&logoColor=white)](https://vitest.dev/)
[![Zod](https://img.shields.io/badge/Zod-4-3E67B1?logo=zod&logoColor=white)](https://zod.dev/)
[![Render](https://img.shields.io/badge/Render-46E3B7?logo=render&logoColor=white)](https://render.com/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)
[![CI](https://img.shields.io/github/actions/workflow/status/bentlyy/Clinica-Salud-Vital/ci.yml?branch=master&label=CI&logo=githubactions)](https://github.com/bentlyy/Clinica-Salud-Vital/actions)
[![Tests](https://img.shields.io/badge/tests-2730%20passing-2ea043)](#-testing)
[![Coverage](https://img.shields.io/badge/coverage-~89%25-2ea043)](#-testing)

<br>

**Estado:** Producto tecnológico funcional · Etapa de validación y preparación comercial

</div>

---

El proyecto busca simplificar procesos como la gestión de pacientes, agenda, fichas clínicas, recetas, laboratorio, facturación y análisis, reduciendo la dependencia de herramientas fragmentadas y tareas administrativas manuales.

---

## 🎯 El problema

La gestión de un centro de salud puede involucrar múltiples herramientas y procesos separados:

- Agenda y reservas
- Información de pacientes
- Historias clínicas
- Recetas
- Resultados de laboratorio
- Facturación y pagos
- Reportes y métricas
- Comunicación y recordatorios

Esta fragmentación puede aumentar el trabajo administrativo, dificultar el acceso a la información y hacer más compleja la operación diaria. Vitaria busca centralizar estos procesos en una única plataforma.

---

## 💡 La solución

Vitaria funciona bajo un modelo **SaaS (Software as a Service)**, permitiendo que distintos centros de salud puedan utilizar la plataforma mediante planes de suscripción.

La arquitectura **multi-tenant** permite separar la información de cada organización dentro de una misma plataforma, haciendo posible escalar el servicio a múltiples clientes.

### Principales áreas de la plataforma

| Área | Funcionalidades |
|------|----------------|
| 📅 Agenda | Reservas, disponibilidad y gestión de citas |
| 👥 Pacientes | Gestión de pacientes y antecedentes |
| 🩺 Atención clínica | Historias clínicas, recetas y diagnósticos |
| 🧪 Laboratorio | Solicitudes, muestras, resultados y seguimiento |
| 💳 Gestión | Facturación, pagos y reportes |
| 📊 Analytics | Indicadores y métricas de operación |
| 🔔 Notificaciones | Recordatorios y comunicaciones |
| 🏢 Multi-tenant | Soporte para múltiples centros de salud |
| 🔐 Seguridad | Autenticación, roles, auditoría y aislamiento de datos |

---

## 🚀 Modelo de negocio

Vitaria está diseñado como un servicio SaaS mediante suscripción mensual. El modelo permite:

- Incorporar nuevos centros de salud sin desarrollar una plataforma independiente para cada uno.
- Ofrecer diferentes planes según las necesidades del cliente.
- Escalar progresivamente la cantidad de organizaciones utilizando la plataforma.
- Generar ingresos recurrentes mediante suscripciones.

El foco inicial es validar la propuesta de valor con centros de salud y profesionales, obtener los primeros clientes y desarrollar un proceso comercial repetible.

---

## 📈 Estado actual

Vitaria cuenta actualmente con una base tecnológica avanzada que permite continuar el proceso de validación y comercialización.

### Producto

- ✅ Plataforma web funcional
- ✅ Backend API REST
- ✅ Arquitectura multi-tenant
- ✅ Gestión de usuarios y roles
- ✅ Agenda y reservas
- ✅ Gestión clínica
- ✅ Laboratorio
- ✅ Facturación
- ✅ Analytics
- ✅ Notificaciones
- ✅ Planes SaaS
- ✅ Panel administrativo

### Calidad

- ✅ Suite automatizada de pruebas backend y frontend
- ✅ Validación TypeScript
- ✅ CI/CD
- ✅ Controles de seguridad
- ✅ Auditoría de operaciones
- ✅ Monitoreo de errores

El proyecto cuenta con más de **2.700 pruebas automatizadas** entre backend y frontend, utilizadas para mantener la estabilidad de la plataforma durante su evolución.

---

## 🛣️ Próxima etapa

El principal desafío de Vitaria ya no consiste únicamente en desarrollar nuevas funcionalidades. La siguiente etapa está enfocada en convertir el producto tecnológico en un negocio sostenible.

### 1. Validación comercial

- Contactar centros de salud y profesionales
- Realizar demostraciones
- Recoger feedback de usuarios
- Identificar necesidades prioritarias

### 2. Primeros clientes

- Implementar pilotos
- Ajustar la experiencia de incorporación
- Validar disposición de pago
- Obtener primeros ingresos recurrentes

### 3. Comercialización

- Definir estrategia de adquisición de clientes
- Implementar acciones de marketing
- Optimizar los planes de suscripción
- Crear procesos de soporte y onboarding

### 4. Escalamiento

- Incorporar nuevos centros
- Mejorar automatización
- Ampliar funcionalidades según necesidades reales
- Explorar nuevos mercados

---

## 🧱 Arquitectura

Vitaria utiliza una arquitectura de **monolito modular**, separando las principales áreas funcionales en módulos independientes.

```
┌─────────────────────────────┐
│        React + Vite         │
│          Frontend            │
└──────────────┬──────────────┘
               │ REST API
┌──────────────▼──────────────┐
│       Express + Node        │
│           Backend            │
│                             │
│ Auth · Booking · Clinical   │
│ Laboratory · Billing        │
│ Analytics · SaaS · Reports  │
└──────────────┬──────────────┘
               │ SQL
┌──────────────▼──────────────┐
│        PostgreSQL            │
│       Multi-tenant DB        │
└─────────────────────────────┘
```

---

## 🛠️ Stack tecnológico

### Frontend

- React
- TypeScript
- Vite
- React Router
- FullCalendar
- Recharts
- Axios

### Backend

- Node.js
- Express
- TypeScript
- Zod
- Winston
- node-cron

### Base de datos

- PostgreSQL
- SQL
- Row-Level Security
- Multi-tenancy

### Infraestructura

- Docker
- Docker Compose
- Render
- GitHub Actions
- Sentry

### Integraciones

- Stripe
- SendGrid
- Twilio

---

## 🔐 Seguridad

La plataforma incorpora diferentes capas de seguridad orientadas a proteger la información y separar los datos entre organizaciones:

- JWT + refresh tokens
- Autenticación de dos factores
- Hashing seguro de contraseñas
- Validación de entradas
- Rate limiting
- CORS
- Helmet
- Sanitización de información
- Auditoría de operaciones
- Row-Level Security
- Protección SSRF
- Conexiones SSL a PostgreSQL
- Gestión de secretos mediante variables de entorno
- Monitoreo de errores

---

## 🧪 Testing

La calidad del software se valida mediante pruebas automatizadas.

```bash
npm test
npm run test:coverage
```

La suite contempla pruebas de backend y frontend, además de validaciones de integración, autenticación, módulos de negocio y componentes de interfaz.

---

## 💻 Desarrollo local

### Requisitos

- Node.js
- npm
- Docker
- PostgreSQL

### Instalación

```bash
git clone https://github.com/bentlyy/Clinica-Salud-Vital.git
cd Clinica-Salud-Vital
npm install
```

Iniciar PostgreSQL:

```bash
docker compose up -d db
```

Configurar variables de entorno:

```bash
cp .env.example .env
```

Iniciar el proyecto:

```bash
npm run dev
```

---

## 📂 Estructura

```
src/
├── modules/
│   ├── auth/
│   ├── booking/
│   ├── doctor/
│   ├── clinical-record/
│   ├── laboratory/
│   ├── billing/
│   ├── analytics/
│   ├── saas/
│   ├── reports/
│   └── ...
│
├── middlewares/
├── shared/
├── jobs/
└── types/

frontend/
├── src/
│   ├── modules/
│   ├── shared/
│   ├── i18n/
│   └── test/

db/
├── init.sql
├── security.sql
└── migrations/
```

---

## 🌐 Visión

La visión de Vitaria es convertirse en una herramienta accesible para la gestión digital de centros de salud, permitiendo que establecimientos de distintos tamaños puedan centralizar su operación sin tener que depender de múltiples sistemas desconectados.

El proyecto parte desde una base tecnológica propia y busca evolucionar mediante la validación directa con usuarios y clientes reales.

---

## 👨‍💻 Proyecto

Vitaria es desarrollado como un proyecto independiente de software y emprendimiento tecnológico. La evolución del producto combina desarrollo de software, infraestructura cloud, seguridad, automatización y diseño de producto.

### 📌 Estado del proyecto

| Campo | Valor |
|-------|-------|
| **Producto** | Vitaria |
| **Modelo** | SaaS B2B |
| **Sector** | Tecnología / Salud digital |
| **Etapa** | Validación y preparación comercial |

---

## 🔗 Enlaces

- **Repositorio:** [https://github.com/bentlyy/Clinica-Salud-Vital](https://github.com/bentlyy/Clinica-Salud-Vital)
- **Demo:** [https://clinica-salud-vital.onrender.com](https://clinica-salud-vital.onrender.com)

---

<div align="center">

**Hecho con ❤️ y tecnología para simplificar la gestión de la salud.**

</div>
