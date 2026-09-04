# 🚀 Deployment Guide

## Overview

- **Backend**: Node.js + Express on Render (or Docker)
- **Frontend**: React 19 + Vite + MUI on Render Static Site (or Docker + nginx)
- **Database**: PostgreSQL on AWS RDS

---

## Branch Strategy

```
main ──────────────────────────────────────────────► Production
  │
  └── develop ─────────────────────────────────────► Staging
        │
        └── feature/* ─────────────────────────────► Development
```

| Branch | Render Service | Purpose |
|--------|---------------|---------|
| `main` | `vitaria-api` + `vitaria-frontend` | Production |
| `develop` | `vitaria-api-staging` + `vitaria-frontend-staging` | Staging/QA |
| `feature/*` | Local Docker only | Development |

### How to Deploy

#### Automatic (via Render)
1. Push to `main` → Render auto-deploys to production
2. Push to `develop` → Render auto-deploys to staging

#### Manual (via Docker)
```bash
# Production
docker compose -f docker-compose.prod.yml up -d --build

# Development (with hot reload)
docker compose up -d
```

---

## Environment Variables

### Production (Render Dashboard)

Set these in the Render dashboard under each service:

**Backend (`vitaria-api`)**:
```
DATABASE_URL=postgresql://user:password@your-rds-host:5432/clinic
JWT_SECRET=<your-production-secret>
FRONTEND_URL=https://yourdomain.com
PHI_MASTER_KEY=<64-hex-chars>
AUDIT_HMAC_SECRET=<32+ chars>
ENCRYPTION_KEY=<32-hex-chars>
INVITE_JWT_SECRET=<32+ chars>
SUPERADMIN_PASSWORD=<strong-password>
RECAPTCHA_SECRET_KEY=<your-recaptcha-secret>
DB_CA_CERT=<aws-rds-ca-cert>
```

**Frontend (`vitaria-frontend`)**:
```
VITE_API_URL=/api
```

> **Note**: `VITE_API_URL=/api` makes the frontend proxy API calls through nginx to the backend. In production, the frontend and backend are served from the same domain.

### Local Development (.env)

```bash
# Database (local Docker or AWS RDS)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/clinic
# OR for AWS RDS:
# DATABASE_URL=postgresql://user:password@your-rds-host:5432/clinic

# Frontend
VITE_API_URL=http://localhost:3000/api
FRONTEND_URL=http://localhost:5173
```

---

## AWS RDS Connection

The backend connects to AWS RDS using the `DATABASE_URL` environment variable.

### Required: CA Certificate

AWS RDS requires SSL with a CA certificate. The certificate is stored in `DB_CA_CERT` env var.

### Security Group Rules

Ensure your RDS security group allows:
- **Type**: PostgreSQL (5432)
- **Source**: Render's outbound IPs (or `0.0.0.0/0` for testing)

---

## Docker Architecture

### Development (`docker-compose.yml`)
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Frontend   │────►│   Backend   │────►│  PostgreSQL  │
│  (Vite dev)  │     │  (Express)  │     │  (Docker)    │
│  :5173       │     │  :3000      │     │  :5432       │
└─────────────┘     └─────────────┘     └─────────────┘
```

### Production (`docker-compose.prod.yml`)
```
┌─────────────┐     ┌─────────────┐
│   Frontend   │────►│   Backend   │────► AWS RDS
│  (nginx)     │     │  (Express)  │
│  :80         │     │  :3000      │
└─────────────┘     └─────────────┘
```

### Render (Cloud)
```
┌──────────────────┐     ┌──────────────────┐
│  Static Site      │────►│  Web Service      │
│  (vitaria-frontend)│     │  (vitaria-api)     │
│  *.onrender.com   │     │  *.onrender.com   │
└──────────────────┘     └──────────────────┘
                                │
                                ▼
                         ┌──────────────┐
                         │  AWS RDS      │
                         │  PostgreSQL   │
                         └──────────────┘
```

---

## Frontend Build

The frontend uses Vite for building. The build output is in `frontend/dist/`.

### Build Commands

```bash
# Local development
cd frontend && npm run dev

# Production build
cd frontend && npm run build

# From root (used by Render)
npm run build  # builds backend + frontend
```

### Build Output

```
frontend/dist/
├── index.html
├── assets/
│   ├── index-[hash].js      # Main bundle
│   ├── index-[hash].css     # Styles
│   ├── vendor-[hash].js     # React, React DOM
│   ├── mui-[hash].js        # MUI components
│   ├── charts-[hash].js     # Recharts
│   ├── calendar-[hash].js   # FullCalendar
│   └── ...
└── ...
```

---

## Troubleshooting

### Frontend not loading in production
1. Check that `VITE_API_URL=/api` is set (not a full URL)
2. Verify nginx is serving `index.html` for all routes
3. Check Render build logs for errors

### API calls failing from frontend
1. Ensure backend is running and healthy
2. Check CORS settings in backend
3. Verify `FRONTEND_URL` matches your frontend domain

### Database connection errors
1. Verify `DATABASE_URL` is correct
2. Check AWS RDS security group allows Render's IPs
3. Ensure `DB_CA_CERT` is set for SSL connections

---

## Rollback Procedure

If the new frontend has issues:

1. **Quick rollback**: Revert the `render.yaml` change and redeploy
2. **Docker rollback**: Use the previous docker-compose
3. **Code rollback**: `git revert` the problematic commit

```bash
# Revert last commit
git revert HEAD

# Push to trigger redeploy
git push origin main
```

---

## Backups y Recuperacion

### Estrategia

- **Backup diario automatico**: `.github/workflows/backup.yml` ejecuta a las 02:00 UTC un `pg_dump` en formato custom (`-Fc`, comprimido), lo restaura en una BD desechable para verificar integridad y sube el artefacto a GitHub con retencion de 30 dias.
- **Retencion local**: 30 dumps (`BACKUP_RETENTION` para ajustar).
- **Respaldos remotos (opcional)**: si configuras los secretos `S3_BUCKET` + `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY` + `AWS_DEFAULT_REGION`, el mismo script sube cada dump a S3 (STANDARD_IA).
- **Verificacion local**: `DATABASE_URL=... ./scripts/backup-verify.sh <archivo>` restaura el dump en una BD temporal y valida integridad de tablas, filas y FK.

### Scripts

| Script | Uso |
|--------|-----|
| `scripts/backup.sh` | Linux/CI: `DATABASE_URL=... ./scripts/backup.sh [output_dir]` |
| `scripts/backup.ps1` | Windows: `.\scripts\backup.ps1 [output_dir]` |
| `scripts/backup-verify.sh` | Verifica un dump restaurandolo en una BD temporal |

### Programacion manual (si no usas GitHub Actions)

**Linux (cron):**
```cron
0 2 * * * cd /path/to/app && DATABASE_URL="$DATABASE_URL" ./scripts/backup.sh /var/backups/clinic
```

**Windows (Task Scheduler):** crea una tarea diaria que ejecute:
```
powershell -File C:\path\to\app\scripts\backup.ps1 C:\backups\clinic
```

### Restauracion

```bash
# 1. Crear la BD destino (si no existe)
createdb clinic_restored

# 2. Restaurar el dump custom
pg_restore -d clinic_restored --no-owner --no-acl clinic_backup_<timestamp>.dump

# 3. Validar
psql -d clinic_restored -c "SELECT count(*) FROM users"
```

### Notas de recuperacion ante fallos

- El backend reintenta la conexion a BD hasta 10 veces con backoff exponencial al arrancar.
- Las migraciones registradas en `_migrations` nunca se re-aplican; si restauras una BD anterior, aplica las migraciones pendientes al reiniciar el backend.
- `statement_timeout=30s` e `idle_in_transaction_session_timeout=60s` se aplican a nivel de BD al arrancar.
- El healthcheck de Docker/Render usa `/health` (readiness: proceso + BD). `/health/live` es liveness (el proceso responde) y no consulta BD.

---

## Observabilidad

### Endpoints

| Endpoint | Uso | Notas |
|----------|-----|-------|
| `/health` | Readiness (proceso + BD) | Docker/Render healthcheck |
| `/health/live` | Liveness (proceso responde) | No consulta BD |
| `/metrics` | Metrics en formato Prometheus | Protegido con `METRICS_TOKEN` si se define |

Todos existen también bajo `/api/...` (salvo `/metrics` que además se sirve en `/api/metrics`).

### Variables de entorno

| Variable | Opcional | Uso |
|----------|----------|-----|
| `SENTRY_DSN` | Sí | Monitoreo de errores y alertas por email de Sentry |
| `METRICS_TOKEN` | Sí | Si se define, `/metrics` exige `Authorization: Bearer <token>` |
| `ALERT_WEBHOOK_URL` | Sí | Si se define, errores 5xx y jobs muertos publican un payload JSON al webhook (cooldown 60 s) |

### Qué se expone en `/metrics`

- **Servidor**: CPU, memoria (heap/RSS), event loop lag (prom-client default), loadavg 1/5/15m, uptime, disco (`statfs`: total/used/free/ratio).
- **App**: `http_requests_total`, `http_request_duration_seconds` (histograma) por método/ruta/status; `jobs_total` por tipo/estado; `emails_total` por proveedor/estado.
- **PostgreSQL**: tamaño de BD, conexiones activas, queries lentas (>5 s), estado del pool (total/idle/waiting).

Todas las métricas llevan el prefijo `vitaria_`. Gate: cualquier Prometheus (Render Metrics, Grafana Cloud, Uptime Kuma) puede raspar `/metrics`.

### Logs estructurados

- En producción la consola emite JSON (mismo formato que `error.log`/`combined.log`) para la ingesta del proveedor (Render/Loki/etc).
- Cada request lleva `X-Request-ID` (correlación), y tanto el request logger como el error handler lo incluyen en el campo `requestId` de los logs para rastrear un error completo.

### Alertas

- **Sentry**: configurando `SENTRY_DSN`, los 5xx se capturan y Sentry notifica por email/Slack.
- **Webhook**: con `ALERT_WEBHOOK_URL` se publican errores 5xx y jobs muertos (con dedup de 60 s). El payload incluye `service`, `environment`, `version`, `timestamp`, `title`, `message` y `meta`.
- **Backups**: si un job de backup falla, el workflow de GitHub puede configurarse para notificar.

### Recomendación de monitoreo

1. Raspar `/metrics` cada 30 s con un Prometheus (p. ej. Grafana Cloud free).
2. Crear alertas: `http 5xx rate > 0` por 5 min, `event_loop_lag > 1s`, `disk_usage_ratio > 0.9`, `pg_long_running_queries > 0`, `vitaria_pg_connections` cerca del `max` del pool.
3. Apuntar Uptime Kuma (o similar) a `/health` para disponibilidad externa.
