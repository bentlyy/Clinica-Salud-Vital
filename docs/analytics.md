# Sistema de Analíticas — Clinic Backend

## Arquitectura General

El sistema de analíticas tiene **dos niveles** claramente separados:

| Nivel | Rol | Alcance | Endpoints |
|-------|-----|---------|-----------|
| **Tenant** | admin / doctor | Datos de UNA clínica | `/api/v1/analytics/*` |
| **Superadmin** | superadmin | Datos de TODAS las clínicas | `/api/v1/super-admin/analytics/*` |

Ambos niveles comparten la misma fuente de datos (PostgreSQL compartido) pero se diferencian por el filtro `tenant_id` en las queries.

---

## Tenant-Level Analytics (`/api/v1/analytics`)

### Idea
Cada clínica (tenant) puede ver sus propias métricas para tomar decisiones operativas. Un doctor solo ve sus stats personales; un admin ve toda la clínica.

### Endpoints

| Método | Ruta | Rol | Descripción |
|--------|------|-----|-------------|
| GET | `/dashboard` | admin, superadmin | Snapshot de métricas del día |
| GET | `/bookings-by-month` | admin, doctor, superadmin | Citas agrupadas por mes |
| GET | `/top-doctors` | admin, superadmin | Doctores con más citas |
| GET | `/status-distribution` | admin, doctor, superadmin | Distribución de estados de citas |
| GET | `/my-stats` | doctor | Stats personales del doctor |
| GET | `/no-shows` | admin, superadmin | Inasistencias por doctor |
| GET | `/diagnoses` | admin, superadmin | Diagnósticos más frecuentes |
| GET | `/demand` | admin, superadmin | Pronóstico de demanda (ML) |
| GET | `/schedules` | admin, superadmin | Horarios óptimos (ML) |
| GET | `/vitals` | admin, superadmin | Anomalías en signos vitales (ML) |
| GET | `/export-excel` | admin, superadmin | Exportación Excel completo |

### Datos que usa

**Dashboard** — `users`, `doctors`, `bookings`:
- `total_patients` = users con role user/patient
- `total_doctors` = doctores registrados
- `total_bookings` = citas no canceladas
- `today_bookings` = citas de hoy no canceladas
- `confirmed_bookings` = citas confirmadas no canceladas
- `cancelled_bookings` = citas canceladas

**Bookings by month** — `bookings`:
- Agrupación por `YYYY-MM`
- Conteo de total, confirmadas, canceladas
- Últimos N meses (default 12)

**Top Doctors** — `doctors` + `bookings` (left join):
- Ranking por cantidad de citas (excluye canceladas)
- Incluye especialidad

**Status Distribution** — `bookings`:
- GROUP BY status
- Muestra cantidad por cada estado

**Doctor Stats** — `bookings`, `clinical_records`:
- Total bookings del doctor
- Próximas citas (date >= hoy)
- Pacientes distintos atendidos
- Registros clínicos creados

**No-Shows** — `doctors` + `bookings`:
- Usa `status = 'no_show'` como señal explícita (no heurística)
- Ventana: últimos 6 meses
- Muestra total de citas y cantidad de no-shows por doctor

**Diagnósticos** — `clinical_records`:
- Top 20 diagnósticos más frecuentes
- Solo registros con diagnosis no vacío

**Demand Forecast** — `bookings` + ML (`ml_service.forecastDemand`):
- Datos históricos (bookings reales por día)
- Pronóstico ML (predicción de demanda futura)
- Fallback: solo históricos si ML falla

**Optimal Schedules** — ML (`ml_service.analyzeOptimalSchedules`):
- Por día de semana: mejor hora y ocupación
- Score por franja horaria (0-100)
- Fallback: datos simulados si ML falla

**Vital Signs Anomalies** — `clinical_records` + ML:
- Últimos 50 registros con signos vitales (30 días)
- ML detecta anomalías en presión, frecuencia cardíaca, temperatura
- Fallback: array vacío si ML falla

---

## Superadmin Analytics (`/api/v1/super-admin/analytics`)

### Idea
El superadmin tiene visión **global** de todas las clínicas para monitorear la salud de la plataforma, detectar tendencias y tomar decisiones estratégicas.

### Endpoints

| Método | Ruta | Rol | Descripción |
|--------|------|-----|-------------|
| GET | `/stats` | superadmin | Stats básicos globales |
| GET | `/analytics/dashboard` | superadmin | Dashboard global completo + distribución de planes |
| GET | `/analytics/top-tenants` | superadmin | Top clínicas por bookings/users/doctors/revenue |
| GET | `/analytics/revenue` | superadmin | Ingresos mensuales por suscripciones |
| GET | `/analytics/growth` | superadmin | Nuevos tenants/users/bookings por mes |
| GET | `/tenants/:id` | superadmin | Detalle de un tenant específico con stats |

### Datos que usa

**Dashboard Global** — `tenants`, `users`, `doctors`, `bookings`, `subscriptions`, `subscription_invoices`:
- Tenants totales, activos, inactivos
- Usuarios totales (admin, patient)
- Doctores totales
- Citas totales, confirmadas, canceladas
- Revenue total (subscription_invoices paid)
- MRR (Monthly Recurring Revenue, últimos 30 días)
- Suscripciones activas, canceladas, en trial
- **Distribución de planes**: cantidad de tenants por plan

**Top Tenants** — `tenants` + métrica seleccionada:
- Métrica por defecto: bookings
- Métricas disponibles: bookings, users, doctors, revenue
- Incluye nombre, dominio, fecha creación
- Muestra booking_count, user_count, doctor_count complementarios

**Revenue Analytics** — `subscription_invoices`:
- Ingresos mensuales agrupados por mes
- Cantidad de facturas emitidas
- Últimos N meses (default 12)

**Growth Metrics** — `tenants`, `users`, `bookings`:
- Nuevos tenants por mes
- Nuevos usuarios por mes
- Nuevas bookings por mes
- Serie completa de meses (incluye meses sin datos = 0)
- Últimos N meses (default 12)

---

## Esquema de Datos

### Diagrama de relaciones

```
tenants
  ├── users (tenant_id)
  │    ├── role: 'admin' | 'doctor' | 'user' | 'patient' | 'superadmin'
  │    └── no_show_count
  ├── doctors (tenant_id)
  │    ├── name, specialty, email
  │    └── user_id → users
  ├── bookings (tenant_id)
  │    ├── date, time, status, confirmed
  │    ├── doctor_id → doctors
  │    └── user_id → users (o guest_rut)
  ├── clinical_records (tenant_id)
  │    ├── diagnosis, vital_signs (JSONB)
  │    ├── patient_id → users
  │    └── doctor_id → doctors
  ├── subscriptions (tenant_id)
  │    ├── plan_id → plans
  │    └── status: 'active' | 'trialing' | 'canceled'
  └── subscription_invoices (tenant_id)
       ├── amount, status, paid_at
       └── subscription_id → subscriptions

plans (global)
  ├── code: 'free' | 'basic' | 'pro' | 'enterprise'
  ├── price_monthly
  ├── max_doctors, max_patients
  └── features (JSONB)
```

### Tablas involucradas por nivel

| Tabla | Tenant Analytics | Superadmin Analytics |
|-------|:----------------:|:--------------------:|
| `tenants` | — | Dashboard, Top, Growth |
| `users` | Dashboard | Dashboard, Top, Growth |
| `doctors` | Dashboard, Top, No-Shows | Dashboard, Top |
| `bookings` | Dashboard, Monthly, Top, Status, No-Shows, Demand | Dashboard, Top, Growth |
| `clinical_records` | Doctor Stats, Diagnoses, Vitals | — |
| `subscriptions` | — | Dashboard, Plan Distribution |
| `subscription_invoices` | — | Dashboard, Revenue |
| `plans` | — | Plan Distribution |

---

## Flujo de datos ML

```
bookings (histórico)
  → ml_service.forecastDemand() → Demand Forecast
  → ml_service.analyzeOptimalSchedules() → Optimal Schedules

clinical_records.vital_signs (JSONB)
  → ml_service.trainVitalSignsAnomalyDetector()
  → ml_service.analyzeVitalSigns() → Vital Signs Anomalies
```

### Fallbacks
Cada endpoint de analytics que usa ML tiene un fallback:
| Endpoint | ML falla → |
|----------|------------|
| `/demand` | Solo retorna datos históricos (sin predicción) |
| `/schedules` | Datos simulados (días fijos, ocupación random) |
| `/vitals` | Array vacío |

---

## Exportación Excel

El endpoint `/export-excel` genera un archivo .xlsx con hasta 8 hojas:

1. **Dashboard** — métricas del snapshot
2. **Citas por Mes** — bookings agrupados por mes
3. **Top Doctores** — ranking de doctores
4. **No-Shows por Doctor** — inasistencias por doctor
5. **Diagnósticos** — diagnósticos frecuentes
6. **Demanda / Pronóstico** — histórico + predicción ML
7. **Horarios Óptimos** — recomendaciones ML por día
8. **Signos Vitales** — pacientes con anomalías detectadas

Solo se crean hojas con datos (si un servicio retorna vacío, se omite).

---

## Consideraciones de Seguridad

1. **Aislamiento de tenants**: Todas las queries de tenant-level usan `tenant_id = $1`. Sin excepción.
2. **Superadmin**: Solo rol `superadmin` puede acceder a `/api/v1/super-admin/*`. Usa `authorize('superadmin')` en el router.
3. **Superadmin bypass**: El flag `?all=true` permite que superadmin acceda a endpoints de tenant-level con datos globales (via `resolveTenantId()` en el controller). Esto es un escape hatch, no la vía principal.
4. **Doctor isolation**: `getMyDoctorStats` solo retorna datos del doctor autenticado (vía `req.user.id`).
