# SUB-16 — Archivos

| Archivo | Rol |
|---|---|
| `Dockerfile` | Imagen prod multi-stage (node:20-alpine, non-root) |
| `Dockerfile.dev` | Imagen de desarrollo |
| `docker-compose.yml` | Orquestación local/dev |
| `docker-compose.prod.yml` | Orquestación prod (backend + frontend) |
| `docker-compose.override.yml` | Overrides locales |
| `.dockerignore` | Exclusiones de contexto |
| `render.yaml` | Definición Render (API + SPA) |
| `.github/workflows/ci.yml` | CI (backend, rls-isolation, frontend) |
| `.github/workflows/backup.yml` | Backup diario + verificación |
| `db/ci-rls-bootstrap.sql` | Habilita RLS + rol + grants para CI |
| `db/ci-seed-rls.sql` | Seed de 2 tenants para test RLS |
| `vitest.config.js` | Config de tests y umbrales de cobertura |
| `.env.example` | Plantilla de variables (incompleta — FND-Q3) |
| `scripts/backup.sh` | Dumpea y comprime la BD |
| `scripts/backup-verify.sh` | Verifica un backup |
| `scripts/backup.ps1` | Variante PowerShell |
| `scripts/git-rewrite-commits.js` | Reescritura de historial git |
| `scripts/prospeccion.mjs` + `leads-*.csv/json` | Datos comerciales versionados (FND-Q4) |
| `src/shared/sentry.service.ts` | Sentry opcional |
| `src/shared/metrics.service.ts` | Métricas Prometheus + handler |
| `src/shared/alerts.service.ts` | `notifyCritical` |
| `src/shared/cleanup.service.ts` | Purga de tokens/sesiones |
| `src/utils/logger.ts` | Logger |

## Líneas clave

| Elemento | Ubicación |
|---|---|
| `COPY frontend/dist/ ... \|\| true` | `Dockerfile:23` |
| `plan: free` (API) | `render.yaml:7` |
| Secrets ausentes (`METRICS_TOKEN`, `ADMIN_PASSWORD`, `SENTRY_DSN`, `MERCADOPAGO_*`) | `render.yaml` (no presentes) |
| `metricsHandler` (auth opcional) | `metrics.service.ts:160-179` |
| `notifyCritical` | `alerts.service.ts:13-45` |
| `runFullCleanup` | `cleanup.service.ts:54-83` |
| thresholds de cobertura | `vitest.config.js:19-25` |
