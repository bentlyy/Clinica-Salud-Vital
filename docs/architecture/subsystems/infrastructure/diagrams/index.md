# SUB-16 — Diagramas

> Formato Mermaid (decisión D-1). Fuente: `Dockerfile`, `docker-compose*.yml`, `render.yaml`, `.github/workflows/*`, `src/shared/*.service.ts`.

## D1. Deploy topologies (Render + Docker)

```mermaid
flowchart LR
  subgraph GitHub["GitHub Actions"]
    CI[ci.yml] ; BK[backup.yml]
  end
  subgraph Render["Render"]
    API["vitaria-api (node, free)"]
    FE["vitaria-frontend (static)"]
  end
  subgraph Docker["docker-compose.prod.yml"]
    BE["backend :3000"]
    FED["frontend :80"]
  end
  CI --> API ; CI --> FE
  BK -->|scripts/backup.sh| DB[(PostgreSQL)]
  API --> DB ; BE --> DB
  FE -.rewrite /*.-> API
```

## D2. Pipeline CI

```mermaid
flowchart TD
  P[push/PR] --> J1[backend: audit+typecheck+test+build]
  P --> J2[rls-isolation: init.sql+migraciones+ci-*.sql+vitest]
  P --> J3[frontend: type-check+test+coverage+build]
```

## D3. Observabilidad y mantenimiento

```mermaid
flowchart TD
  M["/metrics & /api/metrics"] --> H[metricsHandler]
  H --> T{"METRICS_TOKEN?"}
  T -->|sí| B{Bearer ok?}
  B -->|no| E401[401]
  B -->|sí| R[render]
  T -->|no| R
  R --> SYS[refreshSystemMetrics]
  R --> DBM["refreshDbMetrics (3 queries/scrape) -> FND-Q6"]
  CRON["cron 03:00"] --> CL[runFullCleanup]
  ALERT[error crítico] --> NC["notifyCritical -> log + webhook (60s) -> FND-Q5"]
```

## D4. Backup diario (con verificación)

```mermaid
flowchart TD
  S["schedule 02:00"] --> G{"secrets.DATABASE_URL?"}
  G -->|no| SKIP["skip (backup real: clinic-backup.timer en OCI)"]
  G -->|sí| CL[install pg-client] --> DUMP["scripts/backup.sh -> .dump"]
  DUMP --> REST["pg_restore en postgres efímero"]
  REST --> VER["contar tablas/_migrations"]
  VER --> UP[upload-artifact 30d]
```
