# SUB-16 — Infraestructura y observabilidad

> **Estado:** AS-IS completado · **Certeza global:** confirmado (código/config versionada). Estado real de despliegue NO VERIFICADO.
> **Evidencia principal:** `Dockerfile`, `Dockerfile.dev`, `docker-compose{,.prod,.override}.yml`, `render.yaml`, `.github/workflows/{ci,backup}.yml`, `vitest.config.js`, `.env.example`, `scripts/backup*.sh`, `src/shared/{sentry,metrics,cleanup,alerts}.service.ts`.

## 1. Propósito

Empaquetado, despliegue, CI/CD, observabilidad (logs/métricas/errores/alertas), backups y limpieza de datos efímeros.

## 2. Componentes

| Área | Artefactos |
|---|---|
| Contenedores | `Dockerfile` (multi-stage prod), `Dockerfile.dev`, `docker-compose.yml`, `docker-compose.prod.yml`, `docker-compose.override.yml`, `.dockerignore` |
| PaaS | `render.yaml` (web `vitaria-api` + static `vitaria-frontend`) |
| CI/CD | `.github/workflows/ci.yml` (backend, rls-isolation, frontend), `.github/workflows/backup.yml` |
| Observabilidad | `src/shared/sentry.service.ts`, `src/shared/metrics.service.ts`, `src/shared/alerts.service.ts`, `src/utils/logger.ts` |
| Mantenimiento | `src/shared/cleanup.service.ts`, `scripts/backup*.sh` |
| Tests/cobertura | `vitest.config.js`, `tests/setup.js` |

## 3. Despliegue (AS-IS)

- **Render:** `vitaria-api` (`env: node`, `region: oregon`, `plan: free`, health `/health`) con build `npm install --include=dev && npm run build` y start `npm start`; frontend `vitaria-frontend` (static, `staticPublishPath: ./frontend/dist`, rewrite `/* -> /index.html`).
- **Docker prod:** multi-stage `node:20-alpine` (builder → runner), usuario no-root `appuser`, `NODE_ENV=production`, `HEALTHCHECK` con `wget /health`, `CMD node dist/app.js`. Compose prod expone backend en `127.0.0.1:3000` y frontend en `127.0.0.1:80`.

## 4. CI

- **backend:** Postgres 15 → `npm ci` → `npm audit --audit-level=critical` → `typecheck` → `npm test` → `build:backend`.
- **rls-isolation:** server Postgres real → carga `db/init.sql` + migraciones + `db/ci-rls-bootstrap.sql` + `db/ci-seed-rls.sql` → `ALTER ROLE clinic_app` → `vitest run tests/integration/rls-isolation.test.js` con `RLS_TEST_DATABASE_URL`.
- **frontend:** `npm ci` → `type-check` → `npm test` → `npm test -- --coverage` (thresholds) → `build`.
- **backup (diario 02:00):** gate sobre `secrets.DATABASE_URL`; `scripts/backup.sh` → dump custom → restore+verify en Postgres efímero → artifact 30 días.

## 5. Observabilidad

- **Sentry** opcional por `SENTRY_DSN` (init tolerante a fallo; `sendDefaultPii:false`; `tracesSampleRate` acotado 0-1).
- **Prometheus** (`prom-client`) con métricas de proceso, HTTP (counter/histogram), jobs, emails, pool PG, disco, load, DB; `metricsHandler` protegido **solo** si existe `METRICS_TOKEN` (ver FND-L1).
- **Alertas** `notifyCritical`: log + POST opcional a `ALERT_WEBHOOK_URL`, cooldown 60 s (sin persistencia).

## 6. Limpieza

- `runFullCleanup` (cron diario 03:00): `refresh_tokens` expirados/revocados, `user_sessions` expiradas/revocadas/ huérfanas, `password_reset_tokens` expirados/usados. Lotes de 500.

## 7. Cobertura de tests

- `vitest.config.js`: `environment: node`, `pool: forks`, `setupFiles: ./tests/setup.js`, `coverage.include: src/**/*.ts`, `exclude: [src/app.ts, src/seed/**, src/jobs/**]`, thresholds `lines 85 / branches 80 / functions 85 / statements 85`.

## 8. NO VERIFICADO

- Estado real de Render (plan free, si `METRICS_TOKEN`/`SENTRY_DSN`/`ADMIN_PASSWORD` están definidos).
- Si `clinic-backup.timer` (OCI) existe y corre (mencionado en `backup.yml`).
- Si el host tiene `frontend/dist` en el contexto de build del `Dockerfile`.
- Cobertura real y nº de tests (README afirma 2730/~89% — no verificado).
