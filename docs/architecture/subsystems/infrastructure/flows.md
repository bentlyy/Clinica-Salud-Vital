# SUB-16 — Flujos

## F1. Build y despliegue del backend (Docker)

```
docker build -f Dockerfile .
  Stage builder: COPY package*.json -> npm ci -> COPY tsconfig+src -> npm run build:backend (tsc -> dist/)
  Stage runner : npm ci --omit=dev -> COPY --from=builder dist/ -> COPY frontend/dist/ (|| true)
                 USER appuser ; HEALTHCHECK wget /health ; CMD node dist/app.js
docker compose -f docker-compose.prod.yml up
  backend (127.0.0.1:3000) ; frontend (127.0.0.1:80, context ./frontend)
```

## F2. CI (push/PR a master|main|develop)

```
backend:  postgres15 -> npm ci -> npm audit --audit-level=critical -> typecheck -> npm test -> build:backend
rls-isolation: postgres15 -> init.sql + migraciones + ci-rls-bootstrap.sql + ci-seed-rls.sql
               -> ALTER ROLE clinic_app -> vitest rls-isolation.test.js (RLS_TEST_DATABASE_URL)
frontend: cd frontend -> npm ci -> type-check -> npm test -> npm test -- --coverage -> build
```

## F3. Observabilidad y mantenimiento en runtime

```
/metrics | /api/metrics -> metricsHandler
   if METRICS_TOKEN -> exige Bearer  (sino: público)   [FND-L1]
   refreshSystemMetrics() (disco, load, uptime)
   refreshDbMetrics() (pool + pg_stat_activity + tamaño, 3 queries por scrape)  [FND-Q6]
   registry.metrics()

cron 0 3 * * * -> runFullCleanup() -> refresh_tokens | user_sessions | orphaned | password_reset_tokens (lotes 500)
error crítico -> queue/alerts -> notifyCritical() -> log + POST ALERT_WEBHOOK_URL (cooldown 60s)  [FND-Q5]
```

## F4. Backup diario

```
GitHub Actions 02:00 -> ¿secrets.DATABASE_URL?
  no -> skip (backup real en servidor OCI: clinic-backup.timer)   [FND-Q note / NO VERIFICADO]
  sí -> apt install postgresql-client -> scripts/backup.sh -> pg_restore en postgres efímero
        -> contar tablas/_migrations -> upload-artifact (30 días)
```

## F5. Seed/build de frontend en Render

```
vitaria-api (web free): npm install --include=dev && npm run build -> npm start ; health /health
vitaria-frontend (static): cd frontend && npm install --include=dev && npm run build
   -> publish ./frontend/dist ; rewrite /* -> /index.html   [FND-Q2: plan free]
```
