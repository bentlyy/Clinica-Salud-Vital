# SUB-12 — Dependencias

## Backend — externas

| Dependencia | Uso |
|---|---|
| `prom-client` | `Registry`, `Counter`, `Gauge`, `Histogram`, `collectDefaultMetrics` (`metrics.service.ts`) |
| `pdfkit` | Render de PDF de informe (`report-pdf.service.ts`) |
| `os` / `fs` (node) | `os.loadavg()`, `fs.statfsSync('/')` para gauges de sistema |
| `express` | `Request`/`Response` en el handler de métricas |

## Backend — internas

| Origen | Destino | Nota |
|---|---|---|
| `analytics.service` | `shared/db` (`pool`) | Queries con `tenant_id` como parámetro |
| `analytics.controller` | `doctor/doctor.service.getDoctorByUserId` | Resolver perfil en `/my-stats` |
| `analytics.controller` | `shared/query.getQueryInt` | `months`/`days`/`limit` |
| `analytics.controller` | `utils/errors.NotFoundError` | Doctor sin perfil |
| `report.service` | `shared/db` (`pool`, `readPool`) | Escritura en `pool`, lectura en `readPool` |
| `report.service` | `shared/queue.service.enqueueJob` | Encola `report:generate` |
| `report.service` | `utils/errors`, `utils/error-codes` | `REPORT_*` |
| `report.controller` | `report-pdf.service` (import dinámico) | Sólo al descargar PDF |
| `queue.service` | `report.service.processReport` (require dinámico) | Worker `report:generate` |
| `queue.service` | `shared/email.service.sendEmail` (import dinámico) | Worker `email:send` |
| `queue.service` | `shared/metrics.service.jobsTotal` | Métrica de jobs |
| `queue.service` | `shared/alerts.service.notifyCritical` | Alerta al morir un job |
| `metrics.service` | `shared/db` (`pool`) | `refreshDbMetrics` (`pg_stat_activity`, `pg_database_size`) |
| `metrics.middleware` | `shared/metrics.service` | Contadores/histograma |
| `app.ts` | `analyticsRoutes` (`:276`), `reportRoutes` (`:284`) | Montaje |
| `app.ts` | `metricsHandler` (`:141-142`) | `/metrics`, `/api/metrics` |
| `app.ts` | `metricsMiddleware` (`:195`) | Instrumentación |
| `app.ts` | `registerWorkers(); startQueueProcessor()` (`:457-460`) | Arranque de cola (worker de reportes) |

## Conexiones a base de datos

| Tabla(s) | Uso |
|---|---|
| `users`, `doctors`, `bookings` | Dashboard, top-doctors, no-shows, schedules, demanda |
| `clinical_records` | Diagnósticos y signos vitales (PHI agregada) |
| `bookings` | Series/estado/demanda |
| `reports` | Persistencia de informes (`config`/`result_url` JSON) |
| `invoices`, `invoice_items` | Informe de ingresos |
| `lab_requests` | Informe de laboratorio |
| `jobs` | Cola de trabajos (worker de reportes) |
| `pg_stat_activity`, `pg_database_size()` | Gauges de BD en `/metrics` |

## Frontend

| Origen | Destino | Nota |
|---|---|---|
| `modules/analytics/services/*` | `shared/services/api-client` | `GET /api/analytics/*` |
| `modules/analytics/hooks/useAnalytics.ts` | TanStack Query | Cache/estados de analítica |
| `modules/reports/hooks/useReports.ts` | TanStack Query | `useGenerateReport`, `useReportDetail` (polling) |
| `modules/reports/utils/reportGenerator.ts` | `shared/utils/localeUtils` (`formatDate`, `formatDateTime`, `formatCurrency`) | Formato CSV |
| `modules/reports/utils/reportGenerator.ts` | `Blob`/`URL.createObjectURL` (navegador) | Descarga CSV cliente |
| Páginas | `react-i18next` (`reports`, `analytics`) | i18n |
| Páginas | `@mui/material`, `framer-motion` | UI |

## Cross-ref a otros subsistemas

- **SUB-11**: rutas `/api/super-admin/analytics/*` y `billing/stats` (analítica cross-tenant y de ingresos SaaS).
- **SUB-8**: `LabAnalyticsPage` y datos de laboratorio.
- **SUB-13/SUB-14**: `queue.service` (jobs/backoff) y `webhook:dispatch` comparten infraestructura.
- **SUB-10**: `jobsTotal`/email worker.
