# Runbooks

> Procedimientos operativos estándar.

## Inicio del Sistema

```bash
# 1. Iniciar base de datos
docker compose up -d db

# 2. Verificar DB
docker compose ps
docker compose logs db

# 3. Iniciar backend (desarrollo)
npm run dev

# 4. Iniciar frontend (separado)
cd frontend && npm run dev
```

## Deploy a Producción

1. Push a `master` → GitHub Actions ejecuta pipeline
2. Verificar el health check post-deploy
3. Monitorear Sentry para errores post-deploy

## Respaldo de Base de Datos

```bash
# Windows
.\scripts\backup.ps1

# Linux/Mac
pg_dump "$DATABASE_URL" | gzip > backup_$(date +%Y%m%d).sql.gz
```

## Verificación de Backups

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/clinic \
  ./scripts/backup-verify.sh backup_20260101.sql.gz
```

## Rollback

- Mantener el build anterior en Render (deploy manual)
- En caso de error: Redeployar versión anterior desde Render dashboard

---

Tags: #operaciones #runbooks
