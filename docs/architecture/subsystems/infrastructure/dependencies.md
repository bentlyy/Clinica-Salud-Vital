# SUB-16 — Dependencias

## Runtime (backend)

| Dependencia | Uso |
|---|---|
| `@sentry/node` | Errores/traces (opcional) |
| `prom-client` | Métricas Prometheus |
| `winston` | Logs |
| `node-cron` | Crones de mantenimiento |
| `pg` | Pool + métricas de conexión |

## Despliegue / CI

| Herramienta | Uso |
|---|---|
| Docker / docker-compose | Empaquetado y orquestación |
| Render | PaaS (web + static) |
| GitHub Actions | CI (`ci.yml`) y backup (`backup.yml`) |
| PostgreSQL 15 (imagen) | Servicio de test/restore en CI |

## Internas

| Origen | Destino | Nota |
|---|---|---|
| `app.ts` | `sentry`, `metrics`, `alerts`, `cleanup` | Instrumentación y crones |
| `queue.service` | `metrics.jobsTotal`, `alerts.notifyCritical` | Observabilidad de jobs |
| `email.service` | `metrics.emailsTotal` | Observabilidad de emails |
| `metrics.service` | `shared/db.pool` | Gauges del pool |
| `ci.yml` | `db/*.sql` + `tests/integration/rls-isolation.test.js` | Bootstrap RLS |
| `backup.yml` | `scripts/backup.sh` | Dump + verificación |

## Variables de entorno relevantes

| Variable | Uso | En `.env.example` | En `render.yaml` |
|---|---|---|---|
| `SENTRY_DSN` | Errores | ❌ | ❌ |
| `METRICS_TOKEN` | Protección `/metrics` | ❌ | ❌ |
| `ALERT_WEBHOOK_URL` | Alertas | ❌ | ❌ |
| `ADMIN_PASSWORD` / `SUPERADMIN_PASSWORD` | Seeds | ✅ (admin) | ❌ / ✅ |
| `DATABASE_URL_SUPERADMIN` | BYPASSRLS | ✅ | ❌ |
| `MERCADOPAGO_ACCESS_TOKEN` | Billing | ✅ | ❌ |
| `SENTRY_TRACES_SAMPLE_RATE` | Tracing | ❌ | ❌ |

> La discrepancia `.env.example` ↔ `render.yaml` ↔ código es la base de FND-Q2/Q3.
