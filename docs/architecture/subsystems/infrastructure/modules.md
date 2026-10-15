# SUB-16 — Módulos

## Código compartido

| ID | Unidad | Archivo | Responsabilidad |
|---|---|---|---|
| SUB16-U1 | sentry.service | `src/shared/sentry.service.ts` | Init opcional, error handler Express |
| SUB16-U2 | metrics.service | `src/shared/metrics.service.ts` | Registry prom-client, `metricsHandler`, refresco DB/sistema |
| SUB16-U3 | alerts.service | `src/shared/alerts.service.ts` | `notifyCritical` (log + webhook, cooldown) |
| SUB16-U4 | cleanup.service | `src/shared/cleanup.service.ts` | Purga de tokens/sesiones/resets |
| SUB16-U5 | logger | `src/utils/logger.ts` | Winston (registro/archivos) |

## Empaquetado y despliegue

| ID | Artefacto | Notas |
|---|---|---|
| SUB16-A1 | `Dockerfile` | multi-stage; `COPY frontend/dist/ ... \|\| true` frágil |
| SUB16-A2 | `Dockerfile.dev` | imagen de desarrollo |
| SUB16-A3 | `docker-compose.yml` / `.prod.yml` / `.override.yml` | dev / prod / overrides |
| SUB16-A4 | `render.yaml` | `vitaria-api` (web free) + `vitaria-frontend` (static) |
| SUB16-A5 | `.dockerignore` | exclusiones de build |

## CI/CD y operaciones

| ID | Artefacto | Notas |
|---|---|---|
| SUB16-C1 | `.github/workflows/ci.yml` | backend + rls-isolation + frontend |
| SUB16-C2 | `.github/workflows/backup.yml` | backup diario con verificación (gate en secret) |
| SUB16-C3 | `db/ci-rls-bootstrap.sql`, `db/ci-seed-rls.sql` | bootstrap RLS para CI |
| SUB16-M1 | `scripts/backup.sh`, `scripts/backup-verify.sh`, `scripts/backup.ps1` | utilidades de backup |
| SUB16-M2 | `scripts/git-rewrite-commits.js` | reescritura de historial (operación sensible) |

## Observaciones de módulo

- Sin endpoint dedicado en el catálogo salvo `/metrics` y `/api/metrics` (SUB-12/L1).
- `scripts/prospeccion.mjs` y `leads-*.csv/json` viven en el repo (datos comerciales).
- `.env` correctamente en `.gitignore` (no versionado).
