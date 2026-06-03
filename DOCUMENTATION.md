# Documentación — Clínica Salud Vital

---

## Índice

1. [Stack Tecnológico](#stack-tecnológico)
2. [Estructura del Proyecto](#estructura-del-proyecto)
3. [API Conventions](#api-conventions)
4. [Seguridad](#seguridad)
5. [Módulos Detallados](#módulos-detallados)
6. [Machine Learning](#machine-learning)
7. [Sistema de Emails y Notificaciones](#sistema-de-emails-y-notificaciones)
8. [Base de Datos](#base-de-datos)
9. [Testing](#testing)
10. [Variables de Entorno](#variables-de-entorno)
11. [Usuarios de Prueba](#usuarios-de-prueba)
12. [Despliegue en Render](#despliegue-en-render)
13. [Known Issues & Gotchas](#known-issues--gotchas)

---

## Stack Tecnológico

| Capa | Tecnología | Versión |
|------|-----------|---------|
| **Frontend** | React + Vite + FullCalendar + Recharts | 19 / 6 / 6 |
| **Backend** | Node.js + Express 5 + TypeScript | 22 LTS |
| **Base de datos** | PostgreSQL | 15 Alpine |
| **Autenticación** | JWT (access 15min / refresh 30d) + bcrypt (12 rounds) | — |
| **2FA** | TOTP (HMAC-SHA1, 30s window, ±1 step) | — |
| **Validación** | Zod | 4.x |
| **Machine Learning** | TensorFlow.js | 4.22 |
| **Emails** | Nodemailer (Gmail SMTP) + SendGrid | — |
| **SMS / WhatsApp** | Twilio + modo log para desarrollo | — |
| **PDF** | PDFKit | 0.18 |
| **Logging** | Winston (console + file rotation) | 3.x |
| **Testing** | Vitest + Supertest + Coverage V8 | 4.x |
| **Infraestructura** | Render | — |
| **Tareas programadas** | node-cron (cada 5 min) | 4.x |
| **Seguridad** | Helmet, HPP, express-rate-limit | — |
| **Multi-tenancy** | Por subdominio / X-Tenant-Id header | — |
| **Internacionalización** | es / en / pt / fr | — |
| **reCAPTCHA** | react-google-recaptcha (v2 checkbox) | 3.x |

---

## Estructura del Proyecto

```
C:.
├── src/
│   ├── app.ts                        # Entry point (Express 5, routes, migrations, cron)
│   ├── @types/                       # TypeScript declarations
│   ├── types/                        # Shared types
│   ├── utils/                        # Logger, Errors (AppError classes)
│   ├── shared/                       # DB, JWT, Email, SMS, RUT, Date, Query, i18n, Multi-tenant
│   ├── middlewares/                   # Express middleware pipeline
│   │   ├── auth.middleware.ts         # JWT verify + optionalAuth + authorize
│   │   ├── role.middleware.ts         # Role-based access (authorizeRoles)
│   │   ├── tenant.middleware.ts       # Multi-tenancy por subdominio/header
│   │   ├── security.middleware.ts     # Helmet + HPP + env validation
│   │   ├── validate.middleware.ts     # Zod body/params/query
│   │   ├── asyncHandler.middleware.ts # Async error wrapper
│   │   ├── errorHandler.middleware.ts # Global error + 404 handler
│   │   └── requestLogger.middleware.ts# Winston request logging
│   ├── modules/                       # 16 módulos (monolito modular)
│   │   ├── auth/                      # Register, Login, Refresh, Logout, 2FA, Change Password
│   │   ├── booking/                   # CRUD bookings + slots + doctor agenda
│   │   ├── doctor/                    # Register, Create, Profile
│   │   ├── availability/              # Weekly blocks (day_of_week)
│   │   ├── exception/                 # Full/partial day blocks
│   │   ├── specialties/               # Medical specialties catalog
│   │   ├── guest/                     # Guest bookings + RUT lookup
│   │   ├── confirmation/              # Email token confirmation
│   │   ├── clinical-record/           # EHR + prescriptions + CIE-10 + PDF
│   │   ├── analytics/                 # Dashboard + stats + ML + Excel export
│   │   ├── billing/                   # Invoices + payments + insurance
│   │   ├── laboratory/                # Lab tests + requests + results
│   │   ├── audit/                     # Audit logs (admin only)
│   │   ├── rbac/                      # Permissions + roles + granular access
│   │   ├── ml/                        # TensorFlow.js: train, predict, forecast, cache
│   │   └── webhook/                   # Webhooks (admin-only) + event dispatch + delivery log
│   ├── jobs/                          # Tareas programadas
│   │   ├── reminder.job.ts            # Recordatorios 24h/1h (c/5 min)
│   │   └── confirmation.job.ts        # Marcado no-show (diario 2 AM)
│   └── seed/                          # seed.ts + admin.seed.ts
├── tests/
│   ├── unit/                          # Tests unitarios (servicios)
│   ├── integration/                   # Tests de integración (rutas)
│   ├── helpers/                       # db.mock.js + setup.js
│   └── ml.test.js                     # Tests ML
├── db/
│   ├── init.sql                       # Schema completo + seed
│   ├── migrate.sql                    # Migración legacy
│   └── migrations/                    # Migraciones incrementales (10 archivos)
├── frontend/
│   └── src/
│       ├── context/                   # AuthContext + ThemeContext + hooks
│       ├── pages/                     # Páginas de la app
│       ├── api/                       # Axios + API calls module
│       └── components/                # Componentes reutilizables
├── docker-compose.yml                 # Solo PostgreSQL local
└── render.yaml                        # Despliegue en Render
```

---

## API Conventions

### Paginated responses

Todos los endpoints de listado retornan:
```json
{ "data": [...], "pagination": { "page": 1, "limit": 20, "total": 100, "totalPages": 5 } }
```

### Auth

- Header: `Authorization: Bearer <token>`
- Login response: `{ access_token, refresh_token, user }`
- `req.user` disponible en rutas autenticadas (type: `AuthRequest`)

### Error format

```json
{ "error": "message", "details": ["field: detail"], "stack": "..." }
```

Stack solo en desarrollo.

### Validation

Zod schemas en `*.schema.ts`. Middleware `validateZod(schema, 'body'|'params'|'query')`.

---

## Seguridad

### Pipeline de Seguridad

```
Request → Helmet → Tenant → CORS → Compression → JSON(100kb) → Logger → RateLimit → Auth → Zod → Role/RBAC → Audit
```

### Capas de Seguridad

| Capa | Tecnología | Detalle |
|------|-----------|---------|
| **Headers HTTP** | Helmet | CSP (prod), HSTS (1 año, prod), XSS Filter, noSniff, Frameguard deny |
| **HTTP Pollution** | HPP | Previene parameter pollution |
| **CORS** | Custom | localhost:5173 + FRONTEND_URL + RENDER_EXTERNAL_URL |
| **Rate Limiting** | express-rate-limit | Global: 500/15min, Auth: 30/15min, RUT: 10/15min, ML Train: 5/h, ML Predict: 30/min |
| **Body Size** | Express json | Límite 100KB |
| **Auth** | JWT + bcrypt | Access token 15 min, Refresh token 30 días, bcrypt 12 rounds |
| **2FA** | TOTP | HMAC-SHA1, 30s window ±1 step, Google Authenticator / Authy |
| **Refresh Rotation** | JWT | Cada refresh revoca el token anterior |
| **Validación** | Zod 4.x | Schemas estrictos en body/params/query |
| **Roles** | RBAC | admin / doctor / user con permisos granulares |
| **Auditoría** | Audit Middleware | Log de cambios en entidades críticas |
| **Errores** | Custom | Stack trace solo en desarrollo |
| **Env Validation** | Security Middleware | JWT_SECRET >= 32 chars validado al iniciar |
| **Race Conditions** | Advisory Locks | pg_advisory_xact_lock en creación de bookings |
| **Password Policy** | Zod + bcrypt | Min 8 chars, mayúscula, minúscula, número, especial |

---

## Módulos Detallados

### 1. Auth (`src/modules/auth/`)

| Función | Endpoint | Descripción |
|---------|----------|-------------|
| `register` | `POST /api/v1/auth/register` | Registro con email + password + RUT + phone. Validación RUT chileno. Hash bcrypt 12 rounds. |
| `login` | `POST /api/v1/auth/login` | Login con JWT. Timing-safe comparison. Retorna `access_token` + `refresh_token` + `user`. Soporta `totp_token` si 2FA activo. |
| `refresh` | `POST /api/v1/auth/refresh` | Renueva access+refresh token con rotation. |
| `logout` | `POST /api/v1/auth/logout` | Revoca refresh token. |
| `logoutAll` | `POST /api/v1/auth/logout-all` | Revoca todos los refresh tokens del usuario. |
| `changePassword` | `POST /api/v1/auth/change-password` | Cambia contraseña con validación de política. Revoca todos los refresh tokens. |
| `enable2FA` | `POST /api/v1/auth/2fa/enable` | Genera secreto TOTP (otpauth://totp/). |
| `verify2FA` | `POST /api/v1/auth/2fa/verify` | Verifica código TOTP y activa 2FA. |
| `disable2FA` | `POST /api/v1/auth/2fa/disable` | Desactiva 2FA. |

### 2. Booking (`src/modules/booking/`)

| Función | Endpoint | Acceso | Descripción |
|---------|----------|--------|-------------|
| `createBooking` | `POST /api/v1/bookings` | user | Crea reserva con advisory lock. Verifica disponibilidad, excepciones, overlapping. Auto-confirmado (`confirmed=true`). Envía email notificación. |
| `getMyBookings` | `GET /api/v1/bookings/me` | user | Lista paginada de reservas del usuario. |
| `cancelBooking` | `DELETE /api/v1/bookings/:id` | user | Cancela (status=cancelled). Verifica ownership. |
| `getAvailableSlots` | `GET /api/v1/bookings/available-slots?doctor_id=&date=` | Público | Calcula slots disponibles (duración, disponibilidad semanal, excepciones, bookings existentes). |
| `getDoctorBookings` | `GET /api/v1/bookings/doctor` | doctor | Agenda paginada del doctor autenticado. |

### 3. Doctor (`src/modules/doctor/`)

| Función | Endpoint | Acceso | Descripción |
|---------|----------|--------|-------------|
| `getDoctors` | `GET /api/v1/doctors/public` | Público | Lista doctores (cache 60s). |
| `getDoctors` | `GET /api/v1/doctors` | admin | Lista admin con datos de usuario. |
| `registerDoctor` | `POST /api/v1/doctors/register` | admin | Crea usuario + perfil + disponibilidad default (Lun-Vie 9-17). Password aleatorio 12 chars. Envía credenciales por email. |
| `createDoctor` | `POST /api/v1/doctors` | admin | Crea doctor para usuario existente (role=doctor). |
| `getMyDoctorProfile` | `GET /api/v1/doctors/me` | doctor | Perfil del doctor autenticado. |
| `listUsers` | `GET /api/v1/doctors/users` | admin | Lista usuarios del tenant (paginado, filtro por rol/búsqueda). |
| `toggleUserActive` | `PATCH /api/v1/doctors/users/:id/active` | admin | Activa/desactiva usuario (toggle `active`). |

### 4. Availability (`src/modules/availability/`)

| Función | Endpoint | Acceso | Descripción |
|---------|----------|--------|-------------|
| `getMyAvailability` | `GET /api/v1/availability/me` | doctor | Bloques de disponibilidad. |
| `getAvailabilityByDoctor` | `GET /api/v1/availability/:id` | Público | Disponibilidad de un doctor. |
| `createAvailability` | `POST /api/v1/availability` | doctor | Crea bloque horario (HH:MM, start<end, sin overlap). |
| `deleteAvailability` | `DELETE /api/v1/availability/:id` | doctor | Elimina bloque verificando ownership. |

### 5. Exception (`src/modules/exception/`)

| Función | Endpoint | Acceso | Descripción |
|---------|----------|--------|-------------|
| `getMyExceptions` | `GET /api/v1/exceptions/me` | doctor | Excepciones del doctor. |
| `createException` | `POST /api/v1/exceptions` | doctor | Bloqueo full-day o partial. |
| `deleteException` | `DELETE /api/v1/exceptions/:id` | doctor | Elimina excepción. |

### 6. Specialties (`src/modules/specialties/`)

| Función | Endpoint | Acceso | Descripción |
|---------|----------|--------|-------------|
| `getSpecialties` | `GET /api/v1/specialties` | Público | Lista todas las especialidades médicas. |
| `createSpecialty` | `POST /api/v1/specialties` | admin | Crea nueva especialidad. |

### 7. Guest (`src/modules/guest/`)

| Función | Endpoint | Acceso | Descripción |
|---------|----------|--------|-------------|
| `createGuestBooking` | `POST /api/v1/guest/booking` | Público | Reserva sin login. RUT + email. Validación RUT. Rate limited. |
| `getGuestBookingsByRut` | `GET /api/v1/guest/bookings/:rut` | Rate-limited | Busca reservas por RUT. |
| `cancelGuestBooking` | `DELETE /api/v1/guest/booking/:id` | user/admin/doctor | Cancela reserva. Admin/doctor cualquier reserva, user solo propias. |

### 8. Confirmation (`src/modules/confirmation/`)

| Función | Endpoint | Acceso | Descripción |
|---------|----------|--------|-------------|
| `confirmBooking` | `POST /api/v1/confirmation/confirm` | Público | Confirma cita via JWT token del email. |

### 9. Clinical Record (`src/modules/clinical-record/`)

| Función | Endpoint | Acceso | Descripción |
|---------|----------|--------|-------------|
| `getClinicalRecords` | `GET /api/v1/clinical-records` | doctor/admin | Lista filtrable. Doctor ve solo sus registros. |
| `getClinicalRecordById` | `GET /api/v1/clinical-records/:id` | doctor/admin/user | Registro + recetas. Acceso por rol. |
| `getByPatient` | `GET /api/v1/clinical-records/patient/:patient_id` | doctor/admin/user | Historial del paciente. |
| `createClinicalRecord` | `POST /api/v1/clinical-records` | doctor | Crea registro: motivo, anamnesis, signos vitales (JSONB), examen físico, diagnóstico, CIE-10, plan. |
| `updateClinicalRecord` | `PUT /api/v1/clinical-records/:id` | doctor | Actualiza. No modifica registros completed. |
| `deleteClinicalRecord` | `DELETE /api/v1/clinical-records/:id` | doctor | Cancela solo si status=draft. |
| `createPrescription` | `POST /api/v1/clinical-records/prescriptions` | doctor | Crea receta (11 vías disponibles). |
| `updatePrescription` | `PUT /api/v1/clinical-records/prescriptions/:id` | doctor | Actualiza receta. |
| `deletePrescription` | `DELETE /api/v1/clinical-records/prescriptions/:id` | doctor | Elimina receta. |
| `searchCie10` | `GET /api/v1/clinical-records/cie10/search?q=` | doctor/admin | Búsqueda CIE-10. |
| `getCie10ByCode` | `GET /api/v1/clinical-records/cie10/:code` | doctor/admin | Código específico. |
| `getCie10Categories` | `GET /api/v1/clinical-records/cie10/categories` | doctor/admin | Categorías disponibles. |
| `downloadPrescriptionPDF` | `GET /api/v1/clinical-records/prescriptions/:id/pdf` | doctor | PDF de receta con PDFKit. |

### 10. Analytics (`src/modules/analytics/`)

| Función | Endpoint | Acceso | Descripción |
|---------|----------|--------|-------------|
| `getDashboardStats` | `GET /api/v1/analytics/dashboard` | admin | KPIs: pacientes, doctores, reservas, hoy, confirmadas, canceladas. |
| `getBookingsByMonth` | `GET /api/v1/analytics/bookings-by-month` | admin/doctor | Reservas por mes. |
| `getTopDoctors` | `GET /api/v1/analytics/top-doctors` | admin | Ranking doctores por reservas. |
| `getBookingStatusDistribution` | `GET /api/v1/analytics/status-distribution` | admin/doctor | Distribución de estados. |
| `getMyDoctorStats` | `GET /api/v1/analytics/my-stats` | doctor | Estadísticas personales del doctor. |
| `getNoShows` | `GET /api/v1/analytics/no-shows` | admin | Inasistencias (últimos 6 meses). |
| `getDiagnosesAnalytics` | `GET /api/v1/analytics/diagnoses` | admin | Top 20 diagnósticos. |
| `getDemand` | `GET /api/v1/analytics/demand?days=30` | admin | Demanda histórica + forecast ML. |
| `getSchedules` | `GET /api/v1/analytics/schedules` | admin | Horarios óptimos (ML). |
| `getVitalsAnomalies` | `GET /api/v1/analytics/vitals` | admin | Anomalías signos vitales (ML). |
| `exportExcel` | `GET /api/v1/analytics/export-excel` | admin | Exportar datos a Excel. |

### 11. Billing (`src/modules/billing/`)

| Función | Endpoint | Acceso | Descripción |
|---------|----------|--------|-------------|
| `getInvoices` | `GET /api/v1/billing` | admin/doctor/user | Facturas filtrables. |
| `getInvoiceById` | `GET /api/v1/billing/:id` | admin/doctor/user | Factura específica. |
| `createInvoice` | `POST /api/v1/billing` | admin/doctor | Crea factura (INV-YYYY-XXXXX), items, impuestos/descuentos. |
| `updateInvoiceStatus` | `PATCH /api/v1/billing/:id/status` | admin | pending/paid/cancelled/refunded/overdue. |
| `deleteInvoice` | `DELETE /api/v1/billing/:id` | admin/doctor | Elimina factura. |
| `getBillingStats` | `GET /api/v1/billing/stats` | admin/doctor | Estadísticas de facturación. |

### 12. Laboratory (`src/modules/laboratory/`)

| Función | Endpoint | Acceso | Descripción |
|---------|----------|--------|-------------|
| `getLabTests` | `GET /api/v1/laboratory/tests` | Cualquier auth | Catálogo (9 exámenes con rangos de referencia). |
| `getLabRequests` | `GET /api/v1/laboratory` | admin/doctor/user | Órdenes filtrables. |
| `getLabRequestById` | `GET /api/v1/laboratory/:id` | admin/doctor/user | Orden específica. |
| `createLabRequest` | `POST /api/v1/laboratory` | admin/doctor | Crea orden con tests. |
| `updateLabRequestStatus` | `PATCH /api/v1/laboratory/:id/status` | admin/doctor | Actualiza estado. |
| `updateLabItemResult` | `PATCH /api/v1/laboratory/items/:item_id/result` | admin/doctor | Ingresa resultados JSONB. |
| `cancelLabRequest` | `DELETE /api/v1/laboratory/:id` | admin/doctor | Cancela orden. |

### 13. Audit (`src/modules/audit/`)

| Función | Endpoint | Acceso | Descripción |
|---------|----------|--------|-------------|
| `getAuditLogs` | `GET /api/v1/audit` | admin | Logs filtrables (user_id, action, resource_type, fechas). Paginado. |

### 14. RBAC (`src/modules/rbac/`)

| Función | Endpoint | Acceso | Descripción |
|---------|----------|--------|-------------|
| `getMyPermissions` | `GET /api/v1/rbac/my-permissions` | Cualquier auth | Role + lista de permisos. |
| Granular RBAC | middleware | — | `rbac(permissions)`, `canAccessResource(resource, action)` |

### 15. ML — Machine Learning (`src/modules/ml/`)

| Función | Endpoint | Acceso | Descripción |
|---------|----------|--------|-------------|
| `trainModels` | `POST /api/v1/ml/train` | admin | Entrena los 4 modelos. |
| `getModelStatus` | `GET /api/v1/ml/status` | admin | Estado + métricas + cache stats. |
| `resetModels` | `POST /api/v1/ml/reset` | admin | Dispose modelos + limpia cache. |
| `getMetrics` | `GET /api/v1/ml/metrics` | admin | Performance de ML. |
| `clearCache` | `POST /api/v1/ml/cache/clear` | admin | Limpia LRU cache. |
| `getHealthCheck` | `GET /api/v1/ml/health` | admin | Health check. |
| `predictNoShow` | `POST /api/v1/ml/predict-noshow` | admin | Predice inasistencia. |
| `classifyDiagnosis` | `POST /api/v1/ml/classify-diagnosis` | admin | Clasifica diagnóstico por texto. |
| `getDemandForecast` | `GET /api/v1/ml/demand-forecast?days=` | admin | Pronóstico de demanda. |
| `getOptimalSchedules` | `GET /api/v1/ml/optimal-schedules` | admin | Horarios óptimos. |
| `analyzeVitals` | `POST /api/v1/ml/analyze-vitals` | admin | Anomalías en signos vitales. |
| `history/predictions` | `GET /api/v1/ml/history/predictions` | admin | Historial de predicciones. |
| `history/metrics` | `GET /api/v1/ml/history/metrics` | admin | Historial de métricas. |
| `history/forecast` | `GET /api/v1/ml/history/forecast` | admin | Historial de forecast. |
| `export/predictions` | `GET /api/v1/ml/export/predictions` | admin | Exportar predicciones. |
| `export/metrics` | `GET /api/v1/ml/export/metrics` | admin | Exportar métricas. |
| `export/forecast` | `GET /api/v1/ml/export/forecast` | admin | Exportar forecast. |

### 16. Webhooks (`src/modules/webhook/`)

| Función | Endpoint | Acceso | Descripción |
|---------|----------|--------|-------------|
| `listWebhooks` | `GET /api/v1/webhooks` | admin | Lista webhooks configurados. |
| `createWebhook` | `POST /api/v1/webhooks` | admin | Crea webhook (secret auto-generado). |
| `getWebhookById` | `GET /api/v1/webhooks/:id` | admin | Webhook específico. |
| `updateWebhook` | `PUT /api/v1/webhooks/:id` | admin | Actualiza webhook. |
| `deleteWebhook` | `DELETE /api/v1/webhooks/:id` | admin | Elimina webhook. |
| `getDeliveries` | `GET /api/v1/webhooks/:webhook_id/deliveries` | admin | Historial de entregas. |
| `dispatchEvent` | Interna | — | Dispara evento con HMAC-SHA256 a URLs registradas. |

---

## Machine Learning (TensorFlow.js)

### Modelos

- **noShowModel**: Predicción de inasistencia (doctorId, userId, date, time, bookingId)
- **diagnosisModel**: Clasificación de diagnósticos desde texto
- **demandModel**: Pronóstico de demanda diaria
- **vitalAnomalyModel**: Detección de anomalías en signos vitales

### Características

- LRU cache para predicciones (max 100, TTL 5 min)
- Metrics middleware (count + latency)
- Input sanitization + validation (`ml.validator.ts`)
- Training con `trainAllModels()` sobre datos históricos
- Almacenamiento en `ml_prediction_history`, `ml_model_metrics`, `ml_demand_forecast`

---

## Sistema de Emails y Notificaciones

| Tipo | Canal | Disparador |
|------|-------|------------|
| Notificación booking | Email | Al crear reserva (usuario registrado) |
| Notificación guest | Email | Al crear reserva como invitado |
| Credenciales doctor | Email | Al registrar nuevo doctor |
| Recordatorio 24h | Email / SMS | Cron cada 5 min |
| Recordatorio 1h | Email / SMS | Cron cada 5 min |

- Servicio unificado `notification.service.ts` (email + sms + whatsapp)
- SMS: Twilio (producción) / log (desarrollo)
- Email: SendGrid (principal) + Nodemailer Gmail SMTP (fallback)
- Per-tenant from name/address via `tenants.config.email_from_name` / `email_from_address`

---

## Base de Datos

### Tablas (20+)

`users`, `doctors`, `bookings`, `availability`, `exceptions`, `clinical_records`, `prescriptions`, `cie10_catalog`, `audit_logs`, `invoices`, `invoice_items`, `payments`, `insurance_claims`, `lab_tests`, `lab_requests`, `lab_request_items`, `permissions`, `role_permissions`, `user_permissions`, `ml_prediction_history`, `ml_model_metrics`, `ml_demand_forecast`, `specialties`, `refresh_tokens`, `webhooks`, `webhook_deliveries`, `tenants`, `notification_preferences`, `tenant_features`, `plans`, `subscriptions`, `checkout_sessions`

### Índices

30+ índices incluyendo parciales y funcionales (búsqueda por RUT, fechas compuestas, estados).

### Triggers

- `update_clinical_records_updated_at`
- `update_invoices_updated_at`
- `update_insurance_claims_updated_at`
- `update_lab_requests_updated_at`

### Constraints

- `check_guest_or_user`: booking debe tener user_id O (guest_rut + guest_email)
- `unique_booking`: (doctor_id, date, time) único
- `check_future_date`: reservas solo en fecha futura
- `check_slot_duration`: 15, 30, 45 o 60 min
- `check_time_range`: start_time < end_time

---

## Testing

### Estructura

```
tests/
├── unit/
│   ├── auth.service.test.js
│   ├── auth.middleware.test.js
│   ├── booking.service.test.js
│   ├── doctor.service.test.js
│   ├── guest.service.test.js
│   ├── confirmation.service.test.js
│   ├── exception.service.test.js
│   ├── availability.service.test.js
│   ├── laboratory.service.test.js
│   ├── billing.service.test.js
│   ├── rbac.service.test.js
│   ├── specialties.service.test.js
│   ├── validate.middleware.test.js
│   ├── errorHandler.middleware.test.js
│   ├── shared.test.js
│   └── rut.test.js
├── integration/
│   ├── auth.routes.test.js
│   ├── booking.routes.test.js
│   ├── doctor.routes.test.js
│   ├── guest-confirmation.routes.test.js
│   ├── analytics.routes.test.js
│   ├── audit.routes.test.js
│   └── clinical-record.routes.test.js
├── ml.test.js
├── helpers/
│   └── db.mock.js
└── setup.js
```

### Cobertura

| Métrica | Actual | Mínimo |
|---------|--------|--------|
| Statements | 88.9% | 50% |
| Branches | 88.56% | 50% |
| Functions | 92.04% | 50% |
| Lines | 89.1% | 50% |

**1122 tests** · 93 test files · 0 fallos

### Herramientas

- **Framework:** Vitest 4.x
- **HTTP Testing:** Supertest 7.x
- **Coverage:** @vitest/coverage-v8 (text + lcov + html)
- **Mocks:** vi.hoisted() para mocking de módulos ES

### Setup

`tests/setup.js` mocks env vars. DB mocked via `vi.hoisted()` sobre `pool.query`.

---

## Variables de Entorno

```
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/clinic

# Server
PORT=3000
NODE_ENV=development

# URLs
FRONTEND_URL=http://localhost:5173
API_URL=http://localhost:3000

# JWT
JWT_SECRET=CHANGE_ME_USE_LONG_RANDOM_SECRET_IN_PRODUCTION

# Email (Gmail SMTP)
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_gmail_app_password

# SendGrid (principal si está definida)
SENDGRID_API_KEY=

# reCAPTCHA
RECAPTCHA_SECRET_KEY=
VITE_RECAPTCHA_SITE_KEY=

# 2FA
TOTP_ISSUER=ClinicApp

# SMS / WhatsApp (Twilio)
SMS_PROVIDER=log                   # log | twilio | whatsapp
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
TWILIO_WHATSAPP_NUMBER=

# Multi-tenancy
DEFAULT_TENANT_ID=default
APP_LOCALE=es                      # es | en | pt | fr

# Logging
LOG_LEVEL=info
LOG_DIR=logs

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
```

---

## Usuarios de Prueba

### Seed

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

### Datos precargados adicionales

- 12 especialidades médicas
- 26 códigos CIE-10 (circulatorio, endocrino, respiratorio, digestivo, etc.)
- 9 exámenes de laboratorio con rangos de referencia
- 26+ permisos RBAC con asignación por rol
- 12 doctores con disponibilidad default
- 30 pacientes y 120+ bookings (seed completo)

---

## Despliegue en Render

1. Crea una **Web Service** desde tu repo de GitHub
2. Configura:
   - **Build Command**: `npm install && npm run build`
   - **Pre-deploy Command**: `node dist/scripts/migrate.js`
   - **Start Command**: `npm start`
   - **Health Check Path**: `/health`
3. Variables de entorno requeridas:
   - `DATABASE_URL`, `JWT_SECRET`, `FRONTEND_URL`
   - `SENDGRID_API_KEY` (principal) o `EMAIL_USER`, `EMAIL_PASS` (fallback Gmail SMTP)
   - `RECAPTCHA_SECRET_KEY`, `VITE_RECAPTCHA_SITE_KEY`
   - `TOTP_ISSUER`, `SMS_PROVIDER`, `DEFAULT_TENANT_ID`, `APP_LOCALE`

---

## Known Issues & Gotchas

- TypeScript files in `src/utils/` are `.ts` but imported as `.js` (works with tsx/vitest)
- AuthContext `loading` starts as `true` — components must handle loading state
- `frontend/src/context/useAuth.js` exists to fix React fast-refresh (HMR) — import from there, not AuthContext directly
- API returns paginated `{ data, pagination }` — frontend must extract `.data` for `.map()`
- Guest RUT search cleans formatting and searches both `guest_rut` AND `users.rut`
- Login returns `access_token`, `refresh_token` and `user` (not just `token`)
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
- Webhooks only mounted under `/api/v1/webhooks` (no `/api/webhooks` backward compat)
- **Booking auto-confirm**: `confirmed=true` al crear — el email es solo notificación, no requiere clic
- **SendGrid**: Provider principal si `SENDGRID_API_KEY` está definida; fallback a Gmail SMTP
- **reCAPTCHA v2**: CSP permite `https://www.google.com/recaptcha/` y `https://www.gstatic.com/recaptcha/` en script-src y frame-src
- **Auth persistence**: Al montar app, solo restaura sesión si access token NO expiró (15 min ventana); si expiró limpia localStorage
- **Logout**: Limpia localStorage síncronamente ANTES de la llamada API para evitar race condition
- **RegisterPage.jsx**: Incluye campo `name` en estado y body
- **vi.mock paths (ml.service.test.js)**: When mocking modules imported via relative paths, use the path relative to the test file, not the source file. Must use `vi.mock('../../src/modules/ml/ml.cache.js', ...)` to resolve correctly.
