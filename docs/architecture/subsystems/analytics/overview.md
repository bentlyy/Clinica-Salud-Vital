# SUB-12 — Informes, analítica y métricas

> **Estado:** AS-IS completado · **Certeza global:** confirmado (código); métricas de prod NO VERIFICADAS.
> **Evidencia principal:** `src/modules/analytics/*`, `src/modules/reports/*`, `src/shared/metrics.service.ts`, `src/middlewares/metrics.middleware.ts`, `src/shared/queue.service.ts`, `src/app.ts` (montajes y `/metrics`), frontend `modules/{analytics,reports,dashboard}`.

## 1. Propósito

- **Analítica de tenant**: KPIs operativos por clínica (dashboard, series mensuales, top doctores, distribución de estados, no-shows, diagnósticos, demanda, horarios óptimos, anomalías de signos vitales).
- **Informes**: generación asíncrona de reportes (citas, ingresos, pacientes, laboratorio, personalizado) sobre la tabla `reports`, con salida JSON y descarga **CSV generada en el cliente** (y un endpoint PDF en backend no consumido por el SPA).
- **Métricas técnicas**: registro Prometheus (`prom-client`) expuesto en `/metrics` y `/api/metrics`, más instrumentación de requests (`metricsMiddleware`), jobs (`jobsTotal`) e emails (`emailsTotal`).
- **Analítica cross-tenant** del superadmin (`/api/super-admin/analytics/*`, documentada en SUB-11; aquí sólo se referencia).

## 2. Componentes

| Capa | Módulo | Rol |
|---|---|---|
| HTTP | `analytics.routes/controller/service` | KPIs de tenant (10 endpoints, sólo `admin`/`doctor`/`superadmin`) |
| HTTP | `report.routes/controller/service` | Informes asíncronos vía cola (`admin`/`superadmin`) |
| PDF | `reports/report-pdf.service.ts` | Render de reporte con `pdfkit` (endpoint `/reports/:id/pdf`) |
| Metrics | `shared/metrics.service.ts` | Registro Prometheus + handler `/metrics` (token opcional) |
| MW | `middlewares/metrics.middleware.ts` | Contadores/histograma HTTP por ruta normalizada |
| Queue | `shared/queue.service.ts` | Workers `report:generate` y `email:send` (tabla `jobs`, SKIP LOCKED, backoff) |

## 3. Superficie HTTP

### 3.1 Analítica (`/api/analytics`) — montado `app.ts:276`

| Método | Ruta | Roles | Notas |
|---|---|---|---|
| GET | `/api/analytics/dashboard` | admin, superadmin | Conteos base del tenant |
| GET | `/api/analytics/bookings-by-month` | admin, doctor, superadmin | `?months=` (default 12) |
| GET | `/api/analytics/top-doctors` | admin, superadmin | `?limit=` (default 10) |
| GET | `/api/analytics/status-distribution` | admin, doctor, superadmin | Citas por estado |
| GET | `/api/analytics/my-stats` | doctor | Requiere perfil de doctor (`getDoctorByUserId`) |
| GET | `/api/analytics/no-shows` | admin, superadmin | Ausentismo por doctor (6 meses) |
| GET | `/api/analytics/diagnoses` | admin, superadmin | Top 20 diagnósticos (PHI agregada) |
| GET | `/api/analytics/demand` | admin, superadmin | `?days=` (default 30) + forecast SMA 7 días |
| GET | `/api/analytics/schedules` | admin, superadmin | Horarios/horas óptimas (fallback aleatorio) |
| GET | `/api/analytics/vitals` | admin, superadmin | Anomalías de signos vitales (regla, no ML) |

### 3.2 Informes (`/api/reports`) — montado `app.ts:284`

`router.use(authMiddleware)` + `router.use(authorize('admin','superadmin'))` (`report.routes.ts:16-17`).

| Método | Ruta | Validación | Notas |
|---|---|---|---|
| GET | `/api/reports/available` | — | Catálogo estático de tipos |
| POST | `/api/reports/generate` | `generateReportSchema` (`.strict()`) | Crea fila `reports` + encola `report:generate` |
| GET | `/api/reports/:id/pdf` | — | Render `pdfkit` sobre `result_url` (JSON) |
| GET | `/api/reports/:id` | — | Devuelve la fila del reporte |

### 3.3 Métricas — montado `app.ts:141-142`

| Método | Ruta | Auth | Notas |
|---|---|---|---|
| GET | `/metrics` | **sin auth** (token opcional) | Prometheus |
| GET | `/api/metrics` | **sin auth** (token opcional) | Idéntico |

## 4. Roles/alcance

- **Analítica de tenant**: `admin`/`superadmin` para casi todo; `doctor` sólo en `bookings-by-month`, `status-distribution` y `my-stats`; todo acotado por `req.tenant_id`.
- **Informes**: sólo `admin`/`superadmin`; el reporte pertenece a `tenant_id` + `user_id`.
- **Métricas**: endpoint operativo sin autorización salvo `METRICS_TOKEN` (ver FND-L1).
- **Cross-tenant** (super-admin analytics): usa `superAdminPool` (BYPASSRLS) — SUB-11.

## 5. Generación de informes (AS-IS)

- `POST /reports/generate` inserta fila `reports` (`status='generating'`) y `enqueueJob('report:generate', {reportId, tenantId})` (`report.service.ts:130-138`).
- El worker (`queue.service.ts:154-158`) llama `processReport` → elige generador por `type`, escribe el **JSON del resultado** en `result_url` y marca `completed` (o `failed`).
- El frontend hace polling de `GET /reports/:id` y, al completar, descarga un **CSV generado en el navegador** (`frontend/.../reports/utils/reportGenerator.ts`) a partir del JSON de `result_url`.

## 6. Notas (AS-IS)

- Forecast de demanda = **media móvil simple** (`smaForecast`), no un modelo ML; `getVitalSignsAnomalies` usa **reglas clínicas fijas** y fija `mlScore: 0`.
- `getOptimalSchedules` devuelve **datos fabricados con `Math.random()`** si la query falla (ver FND-L4).
- Los tres generadores SQL de informes presentan joins de doctor incorrectos (FND-L2/L3).
- Analítica cross-tenant (`/api/super-admin/analytics/*`) ya documentada en SUB-11; se referencian sus servicios.

## 7. NO VERIFICADO

- Si `METRICS_TOKEN` está definido en producción (no aparece en `.env.example` ni `render.yaml`) → determina si `/metrics` es público (FND-L1).
- Scraping real de `/metrics` (Prometheus/Grafana) y alertas asociadas.
- Volumen/frecuencia de informes y tamaño de `jobs`/`reports` en prod.
- Cobertura de tests de analytics/reports en backend (existen tests de frontend).
- Si algún consumidor externo invoca `GET /reports/:id/pdf` (el SPA no lo hace).
