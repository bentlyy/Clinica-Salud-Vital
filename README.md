# 🏥 Clínica Salud Vital — Sistema de Gestión Clínica

```
╔═══════════════════════════════════════════════════════════════╗
║              SISTEMA DE RESERVA DE CITAS MÉDICAS             ║
║           Gestión clínica integral con ML/Analytics          ║
╚═══════════════════════════════════════════════════════════════╝
```

Sistema full-stack para clínicas que integra agenda médica, historias clínicas electrónicas, facturación, laboratorio, y análisis predictivo con Machine Learning.

---

## 📊 ARQUITECTURA GENERAL

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            FRONTEND (React + Vite)                         │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐  ┌──────────┐  ┌───────────┐  │
│  │  Auth    │  │ Booking  │  │ Doctor    │  │ My       │  │ Analytics │  │
│  │  Pages   │  │  Page    │  │ Panel     │  │ Bookings │  │   Page    │  │
│  └──────────┘  └──────────┘  └───────────┘  └──────────┘  └───────────┘  │
│                              ┌────────────┐                               │
│                              │ AuthContext │                               │
│                              └────────────┘                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                         API (Express 5 / Node.js)                          │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                     MIDDLEWARE PIPELINE                              │   │
│  │  Security → CORS → Compression → JSON(10kb) → Logger → RateLimit    │   │
│  │                              ↓                                       │   │
│  │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐   │   │
│  │  │ Auth │ │Zod   │ │ Role │ │Audit │ │Async │ │Error │ │ ML   │   │   │
│  │  │ JWT  │ │Valid.│ │ RBAC │ │ Log  │ │Handler│ │ Hndl │ │Cache │   │   │
│  │  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘   │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                        MÓDULOS (Monolito Modular)                    │   │
│  │  ┌────────┐ ┌────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐  │   │
│  │  │ Auth   │ │Booking │ │ Doctor   │ │Availability│ │ Exception   │  │   │
│  │  └────────┘ └────────┘ └──────────┘ └──────────┘ └──────────────┘  │   │
│  │  ┌────────┐ ┌────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐  │   │
│  │  │ Guest  │ │Confirm │ │ Clinical │ │ Billing  │ │ Laboratory   │  │   │
│  │  └────────┘ └────────┘ └──────────┘ └──────────┘ └──────────────┘  │   │
│  │  ┌────────┐ ┌────────┐ ┌──────────┐                                 │   │
│  │  │Audit   │ │ RBAC   │ │ ML/TF    │                                 │   │
│  │  └────────┘ └────────┘ └──────────┘                                 │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌──────────────┐  ┌─────────────┐  ┌─────────────────────┐               │
│  │  Email/Nodemailer│   Cron Jobs │  │   ML (TensorFlow.js) │              │
│  │  - Confirmation │  - Reminders │  │  - NoShow Prediction │              │
│  │  - Credentials  │  (c/5 min)   │  │  - Demand Forecast   │              │
│  │  - Reminders    │              │  │  - Vital Anomalies   │              │
│  └──────────────┘  └─────────────┘  └─────────────────────┘               │
├─────────────────────────────────────────────────────────────────────────────┤
│                          DATABASE (PostgreSQL 15)                          │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐       │
│  │ users  │ │doctors │ │bookings│ │clinical│ │invoices│ │lab_*  │       │
│  │        │ │        │ │        │ │_records│ │        │ │        │       │
│  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘ └────────┘       │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐                              │
│  │audit_  │ │permiss.│ │ml_pred.│ │ml_model│                              │
│  │logs    │ │ + roles│ │history │ │_metrics│                              │
│  └────────┘ └────────┘ └────────┘ └────────┘                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🚀 STACK TECNOLÓGICO

| Capa | Tecnología | Versión |
|------|-----------|---------|
| **Frontend** | React + Vite + MUI + FullCalendar | 19 / 6 / 6 |
| **Backend** | Node.js + Express 5 + TypeScript | 22 LTS |
| **Base de datos** | PostgreSQL | 15 Alpine |
| **Autenticación** | JWT + bcrypt (12 rounds) | — |
| **Validación** | Zod | 4.x |
| **Machine Learning** | TensorFlow.js | 4.22 |
| **Emails** | Nodemailer (Gmail SMTP) | 8.x |
| **PDF** | PDFKit | 0.18 |
| **Logging** | Winston | 3.x |
| **Testing** | Vitest + Supertest + Coverage V8 | 4.x |
| **Infraestructura** | Docker + Docker Compose | — |
| **Tareas programadas** | node-cron (cada 5 min) | 4.x |
| **Seguridad** | Helmet, HPP, express-rate-limit | — |
| **Compresión** | compression (Express) | 1.8 |

---

## 📦 ESTRUCTURA DEL PROYECTO

```
C:.
├── src/                              # 🖥️ Backend (TypeScript)
│   ├── app.ts                        # Entry point
│   ├── @types/                       # TypeScript declarations
│   ├── types/                        # Shared types
│   ├── utils/                        # Logger, Errors
│   ├── shared/                       # DB, JWT, Email, RUT, Date utils
│   ├── middlewares/                   # Express middleware pipeline
│   │   ├── auth.middleware.ts         # JWT verification
│   │   ├── role.middleware.ts         # Role-based access
│   │   ├── validate.middleware.ts     # Zod validation
│   │   ├── security.middleware.ts     # Helmet + HPP + env validation
│   │   ├── asyncHandler.middleware.ts # Async error wrapper
│   │   ├── errorHandler.middleware.ts # Global error handler
│   │   └── requestLogger.middleware.ts# Request logging (Winston)
│   ├── modules/
│   │   ├── auth/                      # Registro/Login
│   │   ├── booking/                   # Reservas y slots
│   │   ├── doctor/                    # Gestión de doctores
│   │   ├── availability/              # Disponibilidad semanal
│   │   ├── exception/                 # Excepciones/bloqueos
│   │   ├── guest/                     # Reservas invitados
│   │   ├── confirmation/             # Confirmación por email
│   │   ├── clinical-record/          # Historia clínica + recetas + PDF + CIE-10
│   │   ├── analytics/                # Dashboard + estadísticas + ML
│   │   ├── billing/                  # Facturación + pagos
│   │   ├── laboratory/               # Órdenes de laboratorio
│   │   ├── audit/                    # Logs de auditoría
│   │   ├── rbac/                     # Permisos y roles
│   │   └── ml/                       # Machine Learning (TensorFlow.js)
│   ├── jobs/                         # Tareas programadas
│   │   ├── reminder.job.ts           # Recordatorios 24h/1h
│   │   └── confirmation.job.ts       # Confirmaciones automáticas
│   └── seed/                         # Datos iniciales (seed)
├── tests/                            # 🧪 Tests
│   ├── unit/                         # Tests unitarios (servicios)
│   ├── integration/                  # Tests de integración (rutas)
│   ├── helpers/                      # Mocks compartidos
│   ├── ml.test.js                    # Tests ML
│   └── setup.js                      # Configuración global
├── db/                               # 🗄️ Base de datos
│   ├── init.sql                      # Schema completo + seed (434 líneas)
│   └── migrations/                   # Migraciones incrementales
│       ├── 001_clinical_records.sql
│       ├── 002_audit_logs.sql
│       ├── 003_billing.sql
│       ├── 004_laboratory.sql
│       ├── 005_rbac.sql
│       └── 006_add_indexes.sql
├── frontend/                         # 🎨 Frontend (React + Vite)
│   └── src/
│       ├── context/                  # AuthContext + useAuth
│       ├── pages/                    # Páginas de la app
│       ├── api/                      # Llamadas API
│       └── components/               # Componentes reutilizables
├── coverage/                         # Reportes de cobertura
├── docker-compose.yml                # Orquestación Docker
├── Dockerfile                        # Build de API
└── cloudflare-config.yml             # Despliegue Cloudflare
```

---

## 🔐 SEGURIDAD

### Pipeline de Seguridad

```
Request → Helmet → HPP → CORS → RateLimit → Body Limit(10kb) → Auth → Zod → Role
   │        │        │       │        │            │            │      │      │
   │    [CSP/HSTS/  [HTTP   [CORS  [100 req/  [JSON max  [JWT    [Input [RBAC
   │     Frameguard] Param   Origins] 15min]    10kb]     Verify]  Schema] Check]
   │                Poll.]
   │
   └──→ AuditLog → asyncHandler → Controller → Service → DB
                ↓
           ErrorHandler → Winston(Error/Warn) → JSON Response
```

### Capas de Seguridad Implementadas

| Capa | Tecnología | Detalle |
|------|-----------|---------|
| **Headers HTTP** | Helmet | CSP, HSTS (1 año), XSS Filter, noSniff, Frameguard deny |
| **HTTP Pollution** | HPP | Previene parameter pollution |
| **CORS** | Custom | Solo orígenes whitelisted (localhost:5173 + FRONTEND_URL) |
| **Rate Limiting** | express-rate-limit | Global: 100/15min, Auth: 10/15min, RUT lookup: 10/15min |
| **Body Size** | Express json | Límite 10KB |
| **Auth** | JWT + bcrypt | bcrypt 12 rounds, JWT expires 1d |
| **Validación** | Zod 4.x | Schemas estrictos en body/params/query |
| **Roles** | RBAC | admin / doctor / user con permisos granulares |
| **Auditoría** | Audit Middleware | Log de cambios en entidades críticas |
| **Errores** | Custom | Stack trace solo en desarrollo |
| **Env Validation** | Security Middleware | Valida JWT_SECRET >= 32 chars al iniciar |
| **Race Conditions** | Advisory Locks | pg_advisory_xact_lock en creación de bookings |

---

## 🧠 MÓDULOS — FUNCIONES DETALLADAS

### 1. 🔑 Auth (`src/modules/auth/`)
| Función | Endpoint | Descripción |
|---------|----------|-------------|
| `register` | `POST /api/auth/register` | Registro con email + password + RUT opcional + phone. Validación de RUT chileno. Hash bcrypt 12 rounds. |
| `login` | `POST /api/auth/login` | Login con JWT. Timing-safe comparison (dummy hash). Retorna token + user (id, email, role, rut, phone). |

### 2. 📅 Booking (`src/modules/booking/`)
| Función | Endpoint | Acceso | Descripción |
|---------|----------|--------|-------------|
| `createBooking` | `POST /api/bookings` | user | Crea reserva con advisory lock. Verifica: doctor existe, slot duration, usuario bloqueado, disponibilidad, excepciones, overlapping. Envía email de confirmación con token JWT (7d). |
| `getMyBookings` | `GET /api/bookings/me` | user | Lista paginada de reservas del usuario autenticado. |
| `cancelBooking` | `DELETE /api/bookings/:id` | user | Cancela (status=cancelled). Verifica ownership. |
| `getAvailableSlots` | `GET /api/bookings/available-slots?doctor_id=&date=` | Público | Calcula slots disponibles considerando: duración del doctor, disponibilidad semanal, excepciones, bookings existentes. |
| `getDoctorBookings` | `GET /api/bookings/doctor` | doctor | Agenda paginada del doctor autenticado. |

### 3. 👨‍⚕️ Doctor (`src/modules/doctor/`)
| Función | Endpoint | Acceso | Descripción |
|---------|----------|--------|-------------|
| `getDoctors` | `GET /api/doctors/public` | Público | Lista todos los doctores (cache 60s). |
| `getDoctors` | `GET /api/doctors` | admin | Lista admin de doctores con datos de usuario. |
| `registerDoctor` | `POST /api/doctors/register` | admin | Crea usuario doctor + perfil doctor + disponibilidad default (Lun-Vie 9-17). Genera password aleatorio (12 chars). Envía credenciales por email. |
| `createDoctor` | `POST /api/doctors` | admin | Crea doctor para usuario existente (debe tener role=doctor). |
| `getMyDoctorProfile` | `GET /api/doctors/me` | doctor | Perfil del doctor autenticado. |

### 4. 🗓️ Availability (`src/modules/availability/`)
| Función | Endpoint | Acceso | Descripción |
|---------|----------|--------|-------------|
| `getMyAvailability` | `GET /api/availability/me` | doctor | Bloques de disponibilidad del doctor. |
| `getAvailabilityByDoctor` | `GET /api/availability/:id` | Público | Disponibilidad de un doctor específico. |
| `createAvailability` | `POST /api/availability` | doctor | Crea bloque horario. Valida: formato HH:MM, start<end, sin overlap. |
| `deleteAvailability` | `DELETE /api/availability/:id` | doctor | Elimina bloque verificando ownership. |

### 5. 🚫 Exception (`src/modules/exception/`)
| Función | Endpoint | Acceso | Descripción |
|---------|----------|--------|-------------|
| `getMyExceptions` | `GET /api/exceptions/me` | doctor | Excepciones del doctor. |
| `createException` | `POST /api/exceptions` | doctor | Bloqueo full-day o partial. Validación de tiempos. |
| `deleteException` | `DELETE /api/exceptions/:id` | doctor | Elimina excepción verificando ownership. |

### 6. 🧑 Guest (`src/modules/guest/`)
| Función | Endpoint | Acceso | Descripción |
|---------|----------|--------|-------------|
| `createGuestBooking` | `POST /api/guest/booking` | Público | Reserva sin login. Requiere RUT + email. Validación RUT chileno. Verifica RUT bloqueado por no-show. Envía email confirmación. |
| `getGuestBookingsByRut` | `GET /api/guest/bookings/:rut` | Público | Busca reservas por RUT (limpia formato). Rate limited: 10/15min. |
| `cancelGuestBooking` | `DELETE /api/guest/booking/:id` | user/admin/doctor | Cancela reserva de invitado. Admin/doctor pueden cancelar cualquier reserva, user solo las propias. |

### 7. ✅ Confirmation (`src/modules/confirmation/`)
| Función | Endpoint | Acceso | Descripción |
|---------|----------|--------|-------------|
| `confirmBooking` | `POST /api/confirmation/confirm` | Público | Confirma cita via JWT token del email. Valida token, verifica booking existe, marca confirmed=true. Retorna alreadyConfirmed si ya estaba confirmada. |

### 8. 📋 Clinical Record (`src/modules/clinical-record/`)
| Función | Endpoint | Acceso | Descripción |
|---------|----------|--------|-------------|
| `getClinicalRecords` | `GET /api/clinical-records` | doctor/admin | Lista filtrable (patient_id, status). Doctor ve solo sus registros. |
| `getClinicalRecordById` | `GET /api/clinical-records/:id` | doctor/admin/user | Registro completo + recetas. Verifica acceso por rol. |
| `getClinicalRecordsByPatient` | `GET /api/clinical-records/patient/:patient_id` | doctor/admin/user | Historial del paciente. |
| `createClinicalRecord` | `POST /api/clinical-records` | doctor | Crea registro con: motivo consulta, anamnesis, signos vitales (JSONB), examen físico, diagnóstico, códigos CIE-10, plan tratamiento. |
| `updateClinicalRecord` | `PUT /api/clinical-records/:id` | doctor | Actualiza. No permite modificar registros completed. Verifica ownership. |
| `deleteClinicalRecord` | `DELETE /api/clinical-records/:id` | doctor | Cancela solo si status=draft. |
| **Recetas** | | | |
| `createPrescription` | `POST /api/clinical-records/prescriptions` | doctor | Crea receta con medicamento, dosis, frecuencia, duración, vía (11 vías disponibles). |
| `updatePrescription` | `PUT /api/clinical-records/prescriptions/:id` | doctor | Actualiza receta. |
| `deletePrescription` | `DELETE /api/clinical-records/prescriptions/:id` | doctor | Elimina receta. |
| **CIE-10** | | | |
| `searchCie10` | `GET /api/clinical-records/cie10/search?q=` | doctor/admin | Búsqueda en catálogo CIE-10 (26 códigos precargados). |
| `getCie10ByCode` | `GET /api/clinical-records/cie10/:code` | doctor/admin | Código específico. |
| `getCie10Categories` | `GET /api/clinical-records/cie10/categories` | doctor/admin | Categorías disponibles. |
| **PDF** | | | |
| `downloadPrescriptionPDF` | `GET /api/clinical-records/prescriptions/:id/pdf` | doctor | Genera PDF de receta con PDFKit. |

### 9. 📊 Analytics (`src/modules/analytics/`)
| Función | Endpoint | Acceso | Descripción |
|---------|----------|--------|-------------|
| `getDashboardStats` | `GET /api/analytics/dashboard` | admin | KPIs: total pacientes, doctores, reservas, hoy, confirmadas, canceladas. |
| `getBookingsByMonth` | `GET /api/analytics/bookings-by-month` | admin/doctor | Reservas agrupadas por mes (totales, confirmadas, canceladas). |
| `getTopDoctors` | `GET /api/analytics/top-doctors` | admin | Ranking doctores por reservas. |
| `getBookingStatusDistribution` | `GET /api/analytics/status-distribution` | admin/doctor | Distribución de estados. |
| `getMyDoctorStats` | `GET /api/analytics/my-stats` | doctor | Estadísticas personales del doctor. |
| `getNoShows` | `GET /api/analytics/no-shows` | admin | Inasistencias por doctor (últimos 6 meses). |
| `getDiagnosesAnalytics` | `GET /api/analytics/diagnoses` | admin | Top 20 diagnósticos más frecuentes. |
| `getDemand` | `GET /api/analytics/demand?days=30` | admin | Demanda histórica + forecast ML. |
| `getSchedules` | `GET /api/analytics/schedules` | admin | Horarios óptimos por día (ML). |
| `getVitalsAnomalies` | `GET /api/analytics/vitals` | admin | Anomalías en signos vitales (ML). |

### 10. 💰 Billing (`src/modules/billing/`)
| Función | Endpoint | Acceso | Descripción |
|---------|----------|--------|-------------|
| `getInvoices` | `GET /api/billing` | admin/doctor/user | Facturas filtrables. User ve solo las suyas, doctor las suyas. |
| `getInvoiceById` | `GET /api/billing/:id` | admin/doctor/user | Factura específica con control de acceso. |
| `createInvoice` | `POST /api/billing` | admin/doctor | Crea factura con número auto-generado (INV-2026-XXXXX), items, cálculos de impuestos/descuentos. |
| `updateInvoiceStatus` | `PATCH /api/billing/:id/status` | admin | Actualiza estado (pending/paid/cancelled/refunded/overdue) con datos de pago. |
| `deleteInvoice` | `DELETE /api/billing/:id` | admin/doctor | Elimina factura. |
| `getBillingStats` | `GET /api/billing/stats` | admin/doctor | Estadísticas de facturación. |

### 11. 🔬 Laboratory (`src/modules/laboratory/`)
| Función | Endpoint | Acceso | Descripción |
|---------|----------|--------|-------------|
| `getLabTests` | `GET /api/laboratory/tests` | Cualquier auth | Catálogo de exámenes (9 precargados con rangos de referencia). |
| `getLabRequests` | `GET /api/laboratory` | admin/doctor/user | Órdenes filtrables. User ve solo las suyas. |
| `getLabRequestById` | `GET /api/laboratory/:id` | admin/doctor/user | Orden con control de acceso. |
| `createLabRequest` | `POST /api/laboratory` | admin/doctor | Crea orden con tests. |
| `updateLabRequestStatus` | `PATCH /api/laboratory/:id/status` | admin/doctor | Actualiza estado. |
| `updateLabRequestItemResult` | `PATCH /api/laboratory/items/:item_id/result` | admin/doctor | Ingresa resultados JSONB. |
| `cancelLabRequest` | `DELETE /api/laboratory/:id` | admin/doctor | Cancela orden. |

### 12. 📝 Audit (`src/modules/audit/`)
| Función | Endpoint | Acceso | Descripción |
|---------|----------|--------|-------------|
| `getAuditLogs` | `GET /api/audit` | admin | Logs filtrables por user_id, action, resource_type, fechas. Paginado. |

### 13. 🔐 RBAC (`src/modules/rbac/`)
| Función | Endpoint | Acceso | Descripción |
|---------|----------|--------|-------------|
| `getMyPermissions` | `GET /api/rbac/my-permissions` | Cualquier auth | Retorna role + lista de permisos del usuario. |

### 14. 🤖 ML — Machine Learning (`src/modules/ml/`)
| Función | Endpoint | Acceso | Descripción |
|---------|----------|--------|-------------|
| `trainModels` | `POST /api/ml/train` | admin | Entrena los 4 modelos con datos históricos. |
| `getModelStatus` | `GET /api/ml/status` | admin | Estado de modelos + métricas + cache stats. |
| `resetModels` | `POST /api/ml/reset` | admin | Dispose de modelos + limpia cache. |
| `getMetrics` | `GET /api/ml/metrics` | admin | Métricas de performance de ML. |
| `clearCache` | `POST /api/ml/cache/clear` | admin | Limpia LRU cache de predicciones. |
| `getHealthCheck` | `GET /api/ml/health` | admin | Health check del módulo ML. |
| `predictNoShow` | `POST /api/ml/predict/no-show` | admin | Predice probabilidad de inasistencia. |
| `classifyDiagnosis` | `POST /api/ml/predict/diagnosis` | admin | Clasifica diagnóstico por texto. |
| `getDemandForecast` | `GET /api/ml/forecast/demand?days=` | admin | Pronóstico de demanda. |
| `getOptimalSchedules` | `GET /api/ml/schedules/optimal` | admin | Horarios óptimos por ML. |
| `analyzeVitals` | `POST /api/ml/analyze/vitals` | admin | Analiza signos vitales en búsqueda de anomalías. |

**Modelos ML:**
- `noShowModel`: Predicción de inasistencia
- `diagnosisModel`: Clasificación de diagnósticos
- `demandModel`: Pronóstico de demanda
- `vitalAnomalyModel`: Detección de anomalías en signos vitales

---

## ⚙️ CRON JOBS — TAREAS PROGRAMADAS

```
┌─────────────────────────────────────────────────────────────┐
│                    Scheduler (node-cron)                     │
│                      Cada 5 minutos                         │
│                                                             │
│  ┌─────────────────────────────────┐                        │
│  │   reminder.job.ts               │                        │
│  │   Busca reservas próximas:      │                        │
│  │   ├── 24h antes → envía email   │                        │
│  │   └── 1h antes  → envía email   │                        │
│  │   Marca reminder_24h_sent = TRUE│                        │
│  │   Marca reminder_1h_sent  = TRUE│                        │
│  └─────────────────────────────────┘                        │
│                                                             │
│  ┌─────────────────────────────────┐                        │
│  │   confirmation.job.ts           │                        │
│  │   (mantenimiento)               │                        │
│  └─────────────────────────────────┘                        │
└─────────────────────────────────────────────────────────────┘
```

---

## 🗄️ ESQUEMA DE BASE DE DATOS

```
┌────────────────────────────────────────────────────────────────────┐
│                      DIAGRAMA ENTIDAD-RELACIÓN                     │
└────────────────────────────────────────────────────────────────────┘

    ┌──────────────┐          ┌──────────────────┐
    │    users     │          │     doctors      │
    │──────────────│          │──────────────────│
    │ id (PK)      │◄─────────│ user_id (FK)     │
    │ email (UQ)   │          │ id (PK)          │
    │ password     │          │ name             │
    │ role         │          │ specialty        │
    │ rut (UQ)     │          │ email            │
    │ phone        │          │ slot_duration    │
    │ blocked_until│          └────────┬─────────┘
    │ no_show_count│                  │
    │ created_at   │                  │
    └──────┬───────┘                  │
           │                         │
           │ 1                   1..N │
           │                         │
           ▼                         ▼
    ┌──────────────┐          ┌──────────────────┐
    │   bookings   │          │ doctor_          │
    │──────────────│          │ availability     │
    │ id (PK)      │          │──────────────────│
    │ doctor_id(FK)│          │ id (PK)          │
    │ user_id (FK) │          │ doctor_id (FK)   │
    │ date         │          │ day_of_week      │
    │ time         │          │ start_time       │
    │ duration     │          │ end_time         │
    │ status       │          └──────────────────┘
    │ confirmed    │
    │ guest_rut    │          ┌──────────────────┐
    │ guest_name   │          │ doctor_exceptions│
    │ guest_email  │          │──────────────────│
    │ guest_phone  │          │ id (PK)          │
    │ confirm_token│          │ doctor_id (FK)   │
    │ reminder_*   │          │ date             │
    └──────┬───────┘          │ start_time       │
           │                  │ end_time         │
           │                  │ is_full_day      │
           ▼                  └──────────────────┘
    ┌──────────────────┐
    │ clinical_records │        ┌──────────────────┐
    │──────────────────│        │  prescriptions   │
    │ id (PK)          │        │──────────────────│
    │ patient_id (FK)  │──┐     │ id (PK)          │
    │ doctor_id (FK)   │  │     │ clinical_rec_id  │
    │ booking_id (FK)  │  ├────►│ medication       │
    │ chief_complaint  │  │     │ dosage           │
    │ anamnesis        │  │     │ frequency        │
    │ vital_signs(JSONB)│  │     │ duration         │
    │ physical_exam    │  │     │ route            │
    │ diagnosis        │  │     └──────────────────┘
    │ cie10_codes[]    │  │
    │ treatment_plan   │  │     ┌──────────────────┐
    │ status           │  │     │  cie10_catalog   │
    └──────────────────┘  │     │──────────────────│
                          │     │ code (UQ)        │
    ┌──────────────────┐  │     │ description      │
    │  audit_logs      │  │     │ category         │
    │──────────────────│  │     └──────────────────┘
    │ id (PK)          │  │
    │ user_id (FK)     │  │     ┌──────────────────┐
    │ action           │  │     │   invoices       │
    │ entity_type      │  │     │──────────────────│
    │ entity_id        │  │     │ id (PK)          │
    │ old_values(JSONB)│  │     │ patient_id (FK)  │
    │ new_values(JSONB)│  │     │ booking_id (FK)  │
    │ ip_address (INET)│  │     │ amount           │
    │ user_agent       │  │     │ status           │
    └──────────────────┘  │     │ due_date         │
                          │     │ items (relac.)   │
    ┌──────────────────┐  │     │ payments (relac.)│
    │  lab_requests    │  │     └──────────────────┘
    │──────────────────│  │
    │ id (PK)          │  │     ┌──────────────────┐
    │ patient_id (FK)  │──┘     │  permissions     │
    │ doctor_id (FK)   │        │──────────────────│
    │ clinical_rec_id  │        │ id (PK)          │
    │ status           │        │ name (UQ)        │
    │ items (relac.)   │        │ description      │
    └──────────────────┘        └────────┬─────────┘
                                         │
    ┌──────────────────┐                │
    │ ml_prediction_   │        ┌───────┴──────────┐
    │ history          │        │ role_permissions │
    │──────────────────│        │──────────────────│
    │ model_type       │        │ role + perm_id   │
    │ input_data(JSONB)│        └──────────────────┘
    │ prediction(JSONB)│
    │ confidence       │        ┌──────────────────┐
    └──────────────────┘        │ user_permissions  │
                                │──────────────────│
    ┌──────────────────┐        │ user_id + perm_id │
    │ ml_demand_       │        └──────────────────┘
    │ forecast         │
    │──────────────────│
    │ date (UQ)        │
    │ predicted_demand │
    │ actual_demand    │
    │ confidence       │
    └──────────────────┘
```

**Índices clave (30+ índices):**
- `bookings`: doctor, user, date, status, confirmed, guest_rut, confirmation_token, combinados
- `availability`, `exceptions`: doctor + date
- `users`: rut, rut limpio
- `clinical_records`: patient, doctor, booking, status, compuesto doctor+status+date
- `prescriptions`: clinical_record_id
- `audit_logs`: user, action, entity, created_at
- `invoices`: patient, status, booking, created_at
- `lab_tests`: code
- `lab_requests`: patient, status

**Triggers:**
- `update_clinical_records_updated_at`
- `update_invoices_updated_at`
- `update_insurance_claims_updated_at`
- `update_lab_requests_updated_at`

**Constraints destacadas:**
- `check_guest_or_user`: booking debe tener user_id O (guest_rut + guest_email)
- `unique_booking`: (doctor_id, date, time) único
- `check_future_date`: reservas solo en fecha futura
- `check_slot_duration`: 15, 30, 45 o 60 min
- `check_time_range`: start_time < end_time

---

## 📬 SISTEMA DE EMAILS

| Tipo | Template | Disparador |
|------|----------|------------|
| **Confirmación booking** | `booking.email.ts` | Al crear reserva (usuario registrado) |
| **Confirmación guest** | `guest.email.ts` | Al crear reserva como invitado |
| **Credenciales doctor** | `doctor.email.ts` | Al registrar nuevo doctor |
| **Recordatorio 24h** | `reminder.job.ts` | Cron cada 5 min |
| **Recordatorio 1h** | `reminder.job.ts` | Cron cada 5 min |

---

## 🤖 MACHINE LEARNING (TensorFlow.js)

```
┌────────────────────────────────────────────────────────────┐
│                    ML SUBSYSTEM                             │
│                                                            │
│  ┌──────────────┐    ┌──────────────┐    ┌───────────────┐ │
│  │  ml.service  │───►│  ml.cache    │───►│  ml.middleware│ │
│  │  (TF.js)     │    │  (LRU Cache) │    │  (Metrics)   │ │
│  └──────┬───────┘    └──────────────┘    └───────────────┘ │
│         │                                                    │
│         ├──► NoShow Model  (predictNoShow)                   │
│         ├──► Diagnosis Model  (predictDiagnosis)             │
│         ├──► Demand Model  (forecastDemand)                  │
│         └──► Vital Anomaly Model  (analyzeVitalSigns)        │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  ml.controller  →  ml.validator (sanitize + validate)│   │
│  └──────────────────────────────────────────────────────┘   │
│                                                            │
│  Almacenamiento:                                           │
│  ├── ml_prediction_history (historial de predicciones)     │
│  ├── ml_model_metrics (accuracy, f1, precision, recall)   │
│  └── ml_demand_forecast (predicciones diarias)             │
└────────────────────────────────────────────────────────────┘
```

---

## 🧪 TESTING

### Estructura de Tests

```
tests/
├── unit/                              # 7 archivos
│   ├── auth.service.test.js           # 8 tests (register: 6, login: 4)
│   ├── booking.service.test.js        # 12 tests
│   ├── doctor.service.test.js         # 10 tests
│   ├── guest.service.test.js          # 6 tests
│   ├── confirmation.service.test.js   # 4 tests
│   ├── exception.service.test.js      # 9 tests
│   └── rut.test.js                    # 5 tests (cleanRut, formatRut, validateRut)
├── integration/                       # 6 archivos
│   ├── auth.routes.test.js            # 7 tests
│   ├── booking.routes.test.js         # 10 tests
│   ├── doctor.routes.test.js          # 7 tests
│   ├── guest-confirmation.routes.js   # 7 tests
│   ├── analytics.routes.test.js       # 6 tests
│   ├── audit.routes.test.js           # 3 tests
│   └── clinical-record.routes.test.js # 7 tests
├── ml.test.js                         # Tests de ML
├── helpers/
│   └── db.mock.js                     # Mocks compartidos
└── setup.js                           # Config global de test env
```

### Cobertura Objetivo (vitest.config.js)

| Métrica | Mínimo |
|---------|--------|
| Lines | 50% |
| Branches | 50% |
| Functions | 50% |
| Statements | 50% |

### Herramientas
- **Framework:** Vitest 4.x
- **HTTP Testing:** Supertest 7.x
- **Coverage:** @vitest/coverage-v8 (text + lcov + html)
- **Mocks:** vi.hoisted() para mocking de módulos ES
- **Integración:** Base de datos mockeada (pool.query simulado)

---

## 🔌 API ENDPOINTS — RESUMEN

### Auth
| Método | Ruta | Acceso |
|--------|------|--------|
| POST | `/api/auth/register` | Público |
| POST | `/api/auth/login` | Público |

### Doctors
| Método | Ruta | Acceso |
|--------|------|--------|
| GET | `/api/doctors/public` | Público (cache 60s) |
| GET | `/api/doctors` | admin |
| POST | `/api/doctors/register` | admin |
| POST | `/api/doctors` | admin |
| GET | `/api/doctors/me` | doctor |

### Bookings
| Método | Ruta | Acceso |
|--------|------|--------|
| GET | `/api/bookings/available-slots` | Público |
| POST | `/api/bookings` | user |
| GET | `/api/bookings/me` | user |
| DELETE | `/api/bookings/:id` | user |
| GET | `/api/bookings/doctor` | doctor |

### Availability
| Método | Ruta | Acceso |
|--------|------|--------|
| GET | `/api/availability/:id` | Público |
| GET | `/api/availability/me` | doctor |
| POST | `/api/availability` | doctor |
| DELETE | `/api/availability/:id` | doctor |

### Exceptions
| Método | Ruta | Acceso |
|--------|------|--------|
| GET | `/api/exceptions/me` | doctor |
| POST | `/api/exceptions` | doctor |
| DELETE | `/api/exceptions/:id` | doctor |

### Guest
| Método | Ruta | Acceso |
|--------|------|--------|
| POST | `/api/guest/booking` | Público |
| GET | `/api/guest/bookings/:rut` | Público (rate limited) |
| DELETE | `/api/guest/booking/:id` | user/admin/doctor |

### Confirmation
| Método | Ruta | Acceso |
|--------|------|--------|
| POST | `/api/confirmation/confirm` | Público |

### Clinical Records
| Método | Ruta | Acceso |
|--------|------|--------|
| GET | `/api/clinical-records` | doctor/admin |
| GET | `/api/clinical-records/:id` | doctor/admin/user |
| GET | `/api/clinical-records/patient/:patient_id` | doctor/admin/user |
| POST | `/api/clinical-records` | doctor |
| PUT | `/api/clinical-records/:id` | doctor |
| DELETE | `/api/clinical-records/:id` | doctor |
| GET | `/api/clinical-records/cie10/search` | doctor/admin |
| GET | `/api/clinical-records/cie10/categories` | doctor/admin |
| GET | `/api/clinical-records/cie10/:code` | doctor/admin |
| GET | `/api/clinical-records/prescriptions/:id/pdf` | doctor |
| GET | `/api/clinical-records/:record_id/prescriptions` | doctor/admin |
| POST | `/api/clinical-records/prescriptions` | doctor |
| PUT | `/api/clinical-records/prescriptions/:id` | doctor |
| DELETE | `/api/clinical-records/prescriptions/:id` | doctor |

### Analytics
| Método | Ruta | Acceso |
|--------|------|--------|
| GET | `/api/analytics/dashboard` | admin |
| GET | `/api/analytics/bookings-by-month` | admin/doctor |
| GET | `/api/analytics/top-doctors` | admin |
| GET | `/api/analytics/status-distribution` | admin/doctor |
| GET | `/api/analytics/my-stats` | doctor |
| GET | `/api/analytics/no-shows` | admin |
| GET | `/api/analytics/diagnoses` | admin |
| GET | `/api/analytics/demand` | admin |
| GET | `/api/analytics/schedules` | admin |
| GET | `/api/analytics/vitals` | admin |

### Billing
| Método | Ruta | Acceso |
|--------|------|--------|
| GET | `/api/billing` | admin/doctor/user |
| GET | `/api/billing/stats` | admin/doctor |
| GET | `/api/billing/:id` | admin/doctor/user |
| POST | `/api/billing` | admin/doctor |
| PATCH | `/api/billing/:id/status` | admin |
| DELETE | `/api/billing/:id` | admin/doctor |

### Laboratory
| Método | Ruta | Acceso |
|--------|------|--------|
| GET | `/api/laboratory/tests` | Cualquier auth |
| GET | `/api/laboratory` | admin/doctor/user |
| GET | `/api/laboratory/:id` | admin/doctor/user |
| POST | `/api/laboratory` | admin/doctor |
| PATCH | `/api/laboratory/:id/status` | admin/doctor |
| PATCH | `/api/laboratory/items/:item_id/result` | admin/doctor |
| DELETE | `/api/laboratory/:id` | admin/doctor |

### Audit
| Método | Ruta | Acceso |
|--------|------|--------|
| GET | `/api/audit` | admin |

### RBAC
| Método | Ruta | Acceso |
|--------|------|--------|
| GET | `/api/rbac/my-permissions` | Cualquier auth |

### ML
| Método | Ruta | Acceso |
|--------|------|--------|
| GET | `/api/ml/health` | admin |
| GET | `/api/ml/status` | admin |
| GET | `/api/ml/metrics` | admin |
| POST | `/api/ml/train` | admin |
| POST | `/api/ml/reset` | admin |
| POST | `/api/ml/cache/clear` | admin |
| POST | `/api/ml/predict/no-show` | admin |
| POST | `/api/ml/predict/diagnosis` | admin |
| GET | `/api/ml/forecast/demand` | admin |
| GET | `/api/ml/schedules/optimal` | admin |
| POST | `/api/ml/analyze/vitals` | admin |

### Health
| Método | Ruta | Acceso |
|--------|------|--------|
| GET | `/health` | Público (sin rate limit) |

**Total: ~60+ endpoints**

---

## 🔄 ARQUITECTURA DE MÓDULOS Y DEPENDENCIAS

```
                    auth ────────────────────► jwt(bcrypt)
                      │
                      ▼
   ┌───────────── booking ◄──── doctor ◄──── shared/db
   │                 │
   │                 ▼
   │            confirmation ◄──── email ◄──── shared/jwt
   │                 ▲
   │                 │
   │    guest ───────┘
   │
   │    ◄──── availability ──── exception
   │
   │    ◄──── clinical-record ──── prescription ──── cie10 ──── PDF
   │
   │    ◄──── analytics ──── ml (demand forecast, vitals)
   │
   │    ◄──── billing
   │
   │    ◄──── laboratory
   │
   │    ◄──── audit (middleware)
   │
   │    ◄──── rbac
   │
   └──── ml ──── controller ──── service ──── cache ──── middleware
```

---

## 🚀 CÓMO EJECUTAR

### Con Docker (recomendado)
```bash
docker compose up -d --build
```

### Sin Docker (desarrollo)
```bash
# PostgreSQL en Docker
docker run -d -p 5432:5432 -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=clinic --name clinic-db postgres:15-alpine

# Migraciones
docker exec -i clinic-db psql -U postgres -d clinic < db/init.sql

# Iniciar API
npm install
npm run dev
```

### Tests
```bash
npm test                    # Tests + cobertura
npm run test:watch          # Watch mode
npm run test:ui             # UI Vitest
npm run test:coverage       # Reporte HTML
```

### TypeScript
```bash
npm run typecheck           # Verificar tipos
```

---

## 👤 USUARIOS DE PRUEBA (SEED)

| Rol | Email | Password | RUT |
|-----|-------|----------|-----|
| Admin | admin@clinic.com | REPLACED_PASSWORD | 20.287.886-5 |
| Doctor | juan@clinic.com | REPLACED_PASSWORD | 11.222.333-9 |
| Doctor | maria@clinic.com | REPLACED_PASSWORD | 14.333.444-7 |
| Doctor | carlos@clinic.com | REPLACED_PASSWORD | 13.444.555-5 |
| Doctor | ana@clinic.com | REPLACED_PASSWORD | 12.555.666-3 |
| Paciente | user1@clinic.com | REPLACED_PASSWORD | 15.666.777-3 |
| Paciente | user2@clinic.com | REPLACED_PASSWORD | 16.777.888-1 |
| Paciente | user3@clinic.com | REPLACED_PASSWORD | 17.888.999-9 |

**Datos precargados adicionales:**
- 26 códigos CIE-10 (categorías: circulatorio, endocrino, respiratorio, digestivo, etc.)
- 9 exámenes de laboratorio con rangos de referencia
- 10 permisos RBAC con asignación por rol

---

## 📄 LICENCIA

ISC
