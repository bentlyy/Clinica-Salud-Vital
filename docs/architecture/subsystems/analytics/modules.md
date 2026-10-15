# SUB-12 — Módulos

> Backend: `SUB12-U*` · Frontend: `MOD-f-*`. Rutas en `src/modules/analytics` y `src/modules/reports`; métricas en `src/shared` + `src/middlewares`.

## Backend

| ID | Unidad | Tipo | Archivo | Responsabilidad |
|---|---|---|---|---|
| SUB12-U1 | analytics.routes | Router | `src/modules/analytics/analytics.routes.ts` | 10 rutas; `authMiddleware` + `authorize` por rol |
| SUB12-U2 | analytics.controller | Controller | `src/modules/analytics/analytics.controller.ts` | 10 handlers; parsea `months`/`days`/`limit` con `getQueryInt` |
| SUB12-U3 | analytics.service | Service | `src/modules/analytics/analytics.service.ts` | Queries de KPIs + `smaForecast` + reglas de anomalías; fallbacks con `Math.random()` |
| SUB12-U4 | report.routes | Router | `src/modules/reports/report.routes.ts` | `authMiddleware` + `authorize('admin','superadmin')`; valida `generateReportSchema` |
| SUB12-U5 | report.controller | Controller | `src/modules/reports/report.controller.ts` | `getAvailable`, `generate`, `getById`, `downloadPdf` |
| SUB12-U6 | report.service | Service | `src/modules/reports/report.service.ts` | Generadores SQL + `createReport` (cola) + `processReport` + `getById(Parsed)` |
| SUB12-U7 | report-pdf.service | PDF | `src/modules/reports/report-pdf.service.ts` | `generateReportPDF` (`pdfkit`); tablas por tipo; `_tenantId` sin uso |
| SUB12-U8 | metrics.service | Infra | `src/shared/metrics.service.ts` | Registro Prometheus + `metricsHandler` (token opcional) + gauges de sistema/BD |
| SUB12-U9 | metrics.middleware | Middleware | `src/middlewares/metrics.middleware.ts` | `httpRequestsTotal`/`httpRequestDurationSeconds` por ruta normalizada |
| SUB12-U10 | queue.service | Infra | `src/shared/queue.service.ts` | Workers `report:generate`, `email:send`; `jobs` + `FOR UPDATE SKIP LOCKED`; backoff 30s/120s/480s |
| SUB12-U11 | super-admin analytics | Service/HTTP | `src/modules/super-admin/{super-admin.routes.ts,controller.ts,service.ts}` | Analítica cross-tenant (10 rutas `/analytics/*`) — **documentado en SUB-11** |

## Endpoints por unidad

- **U1/U2**: `/dashboard`, `/bookings-by-month`, `/top-doctors`, `/status-distribution`, `/my-stats`, `/no-shows`, `/diagnoses`, `/demand`, `/schedules`, `/vitals`.
- **U4/U5**: `/available`, `/generate` (POST), `/:id`, `/:id/pdf`.
- **U8**: `/metrics`, `/api/metrics`.

## Frontend (`MOD-f-`)

| ID | Módulo | Archivos clave | Notas |
|---|---|---|---|
| MOD-f-analytics | `frontend/src/modules/analytics` | `pages/AdminAnalyticsPage.tsx`, `components/{BookingsByMonthChart,DemandPanel,DiagnosesPanel,NoShowsPanel,SchedulesPanel,StatusPieChart,VitalsPanel}.tsx`, `hooks/useAnalytics.ts`, `services/analytics.service.ts`, `types/analytics.types.ts` | Consume `/api/analytics/*`; panel admin con 7 subpaneles |
| MOD-f-reports | `frontend/src/modules/reports` | `pages/ReportsPage.tsx`, `hooks/useReports.ts`, `services/report.service.ts`, `utils/reportGenerator.ts`, `types/report.types.ts` | `report.service.ts` sólo `available`/`generate`/`getById`; **descarga = CSV cliente** (`reportGenerator.downloadReport`) |
| MOD-f-dashboard | `frontend/src/modules/dashboard` | `hooks/useAnalytics.ts`, `services/analytics.service.ts`; `shared/services/analytics.ts` | KPIs del dashboard del tenant |
| MOD-f-superadmin | `frontend/src/modules/super-admin` | `pages/SuperAdminAnalyticsPage.tsx` | Analítica cross-tenant (SUB-11) |
| MOD-f-lab | `frontend/src/modules/laboratory` | `pages/LabAnalyticsPage.tsx` | Analítica de laboratorio (cross-ref SUB-8) |

## Observaciones de módulo

- `report.service.ts` (frontend) **no** expone descarga de PDF: el botón "Descargar" usa el generador CSV local → el endpoint `/reports/:id/pdf` no se invoca desde el SPA (FND-L6).
- El `reportGenerator.ts` duplica en cliente los encabezados/estados de cada tipo de informe que el backend ya produce para PDF → dos fuentes de verdad.
- `analytics.service.ts` (backend) mezcla trazabilidad real con *placeholders* (`Math.random`, `mlScore: 0`).
