# SUB-12 — Diagramas

> Formato Mermaid (decisión D-1: `diagram-design` no disponible). Fuente: `src/modules/analytics/*`, `src/modules/reports/*`, `src/shared/metrics.service.ts`, `src/shared/queue.service.ts`, `src/app.ts`.

## D1. Módulos y fuentes de datos

```mermaid
flowchart LR
  subgraph HTTP
    A[analytics.routes /api/analytics]
    R[report.routes /api/reports]
    M["/metrics + /api/metrics"]
  end
  A --> AS[analytics.service]
  R --> RS[report.service]
  RS -->|enqueueJob| Q[(jobs)]
  M --> MS[metrics.service]
  AS --> DB[(PostgreSQL)]
  RS --> DB
  MS --> DB
  AS --> CR[clinical_records]
  AS --> BK[bookings/doctors]
  RS --> INV[invoices/lab_requests]
  RS --> REP[(reports)]
```

## D2. Pipeline asíncrono de informes

```mermaid
sequenceDiagram
  participant U as Usuario (admin)
  participant API as report.controller
  participant S as report.service
  participant Q as queue.service
  participant DB as PostgreSQL
  U->>API: POST /api/reports/generate
  API->>S: createReport(type, config, user, tenant)
  S->>DB: INSERT reports(status='generating')
  S->>Q: enqueueJob('report:generate')
  Q->>DB: INSERT jobs(pending)
  API-->>U: { id, status: 'generating' }
  loop poll 2s
    Q->>DB: UPDATE jobs ... FOR UPDATE SKIP LOCKED
    Q->>S: processReport(reportId, tenant)
    S->>DB: UPDATE reports SET status='completed', result_url=JSON
  end
  U->>API: GET /api/reports/:id (polling)
  API-->>U: { status, result_url }
  U->>U: downloadReport() -> CSV en cliente
```

## D3. Analítica: tenant vs cross-tenant

```mermaid
flowchart TD
  T[Analítica de tenant] --> T1[admin/superadmin: dashboard, top-doctors, no-shows, diagnoses, demand, schedules, vitals]
  T --> T2[doctor: bookings-by-month, status-distribution, my-stats]
  X[Analítica cross-tenant] --> X1["/api/super-admin/analytics/* (superadmin)"]
  X1 --> P[(superAdminPool BYPASSRLS)]
  T1 --> P2[pool con tenant_id]
  T2 --> P2
  NOTE["X1 documentado en SUB-11"]
```

## D4. Superficie de métricas

```mermaid
flowchart LR
  PM[Prometheus scrape] --> EP["/metrics | /api/metrics (sin auth salvo METRICS_TOKEN)"]
  EP --> H[metricsHandler]
  H --> SY[refreshSystemMetrics: loadavg, statfs]
  H --> DBM[refreshDbMetrics: pool, pg_stat_activity, pg_database_size]
  H --> REG[(Registry prom-client)]
  MW[metricsMiddleware] --> REG
  JOBS[queue.service] --> REG
  EM[email.service] --> REG
```
