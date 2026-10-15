# SUB-12 — Archivos

> Rutas del backend relativas a la raíz del repo; frontend relativas a `frontend/src`.

## Backend

| Archivo | Líneas | Rol |
|---|---|---|
| `src/modules/analytics/analytics.routes.ts` | 33 | Router de analítica (10 endpoints, `authorize` por rol) |
| `src/modules/analytics/analytics.controller.ts` | 63 | Handlers; parsea query; `getMyDoctorStats` requiere perfil de doctor |
| `src/modules/analytics/analytics.service.ts` | 332 | 9 funciones de KPIs + `smaForecast`; interfaces de fila; fallbacks |
| `src/modules/reports/report.routes.ts` | 24 | Router de informes; `generateReportSchema` (`.strict()`); guard admin/superadmin |
| `src/modules/reports/report.controller.ts` | 45 | `getAvailable`/`generate`/`getById`/`downloadPdf` |
| `src/modules/reports/report.service.ts` | 189 | Generadores SQL (`createReport`/`processReport`/`getById(Parsed)`) |
| `src/modules/reports/report-pdf.service.ts` | 161 | `generateReportPDF` (pdfkit); `getColumns`/`getRows`/`drawTable` |
| `src/shared/metrics.service.ts` | 181 | Registro Prometheus; `normalizePath`; `refreshSystemMetrics`/`refreshDbMetrics`; `metricsHandler` |
| `src/middlewares/metrics.middleware.ts` | 31 | Instrumentación HTTP; `SKIP_PATHS` |
| `src/shared/queue.service.ts` | 181 | Cola `jobs`; workers `report:generate`/`email:send`/`webhook:dispatch` |

## Frontend

| Archivo | Rol |
|---|---|
| `modules/analytics/pages/AdminAnalyticsPage.tsx` | Página admin de analítica (rol admin/superadmin) |
| `modules/analytics/components/BookingsByMonthChart.tsx` | Serie mensual de citas |
| `modules/analytics/components/StatusPieChart.tsx` | Distribución por estado |
| `modules/analytics/components/NoShowsPanel.tsx` | Ausentismo por doctor |
| `modules/analytics/components/DiagnosesPanel.tsx` | Top diagnósticos |
| `modules/analytics/components/DemandPanel.tsx` | Demanda + forecast |
| `modules/analytics/components/SchedulesPanel.tsx` | Horarios óptimos |
| `modules/analytics/components/VitalsPanel.tsx` | Anomalías de signos vitales |
| `modules/analytics/hooks/useAnalytics.ts` | Hooks TanStack Query de analítica |
| `modules/analytics/services/analytics.service.ts` | Cliente `/api/analytics/*` |
| `modules/analytics/types/analytics.types.ts` | Tipos de respuesta |
| `modules/reports/pages/ReportsPage.tsx` | Selección de tipo, rango y polling de estado |
| `modules/reports/hooks/useReports.ts` | `useGenerateReport`, `useReportDetail` |
| `modules/reports/services/report.service.ts` | Cliente `available`/`generate`/`getById` (**sin** pdf) |
| `modules/reports/utils/reportGenerator.ts` | Generadores CSV en cliente + `downloadReport` (usa `result_url`) |
| `modules/reports/types/report.types.ts` | Tipos de informe |
| `modules/dashboard/hooks/useAnalytics.ts` | KPIs del dashboard de tenant |
| `modules/dashboard/services/analytics.service.ts` | Cliente de KPIs del dashboard |
| `shared/services/analytics.ts` | Servicio de analítica compartido |
| `modules/super-admin/pages/SuperAdminAnalyticsPage.tsx` | Analítica cross-tenant (SUB-11) |
| `modules/laboratory/pages/LabAnalyticsPage.tsx` | Analítica de laboratorio (SUB-8) |

## Tests existentes (frontend, muestra)

`frontend/src/test/components/analytics/*` (7), `hooks/useAnalytics.test.tsx`, `hooks/useAnalyticsModule.test.tsx`, `hooks/useReports.test.tsx`, `pages/AdminAnalyticsPage.test.tsx`, `pages/ReportsPage.test.tsx`, `pages/super-admin/SuperAdminAnalyticsPage.test.tsx`, `pages/laboratory/LabAnalyticsPage.test.tsx`, `services/analytics*.test.ts`, `services/report.service.test.ts`, `utils/reportGenerator.test.ts`.
