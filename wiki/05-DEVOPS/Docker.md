# Docker

> Configuración de contenedores para desarrollo y producción.

## Archivos Docker

| Archivo | Propósito |
|---------|-----------|
| `docker-compose.yml` | Desarrollo: db + backend + frontend (hot reload) |
| `docker-compose.prod.yml` | Producción: backend + frontend (nginx) |
| `Dockerfile` | Backend producción: multi-stage, non-root |
| `Dockerfile.dev` | Backend desarrollo |
| `frontend/Dockerfile` | Frontend producción: Vite build + nginx |
| `frontend/Dockerfile.dev` | Frontend desarrollo |

## Docker Compose (Desarrollo)

```yaml
services:
  db:        # PostgreSQL 15 Alpine
  backend:   # Express + tsx watch (hot reload)
  frontend:  # Vite dev server (hot reload)
```

- DB: Puerto 5432, healthcheck con pg_isready
- Backend: Puerto 3000, depende de db healthy
- Frontend: Puerto 5173, depende de backend

## Docker Compose (Producción)

```yaml
services:
  backend:   # Node.js 20 Alpine, non-root
  frontend:  # nginx Alpine, sirve archivos estáticos
```

- Sin DB local (asume RDS externo)
- Frontend expone puerto 80
- Backend expone puerto 3000

## Dockerfile Backend (Producción)

Multi-stage build:
1. **Builder**: `node:20-alpine` — instala deps, compila TypeScript
2. **Runner**: `node:20-alpine` — solo producción, usuario no-root, healthcheck

## Frontend Docker

Multi-stage:
1. **Builder**: `node:20-alpine` — Vite build
2. **Runner**: `nginx:alpine` — sirve archivos estáticos

## Scripts de Backup

| Script | Propósito |
|--------|-----------|
| `scripts/backup.ps1` | Backup de DB en Windows (pg_dump + S3) |
| `scripts/backup-verify.sh` | Verificación de integridad de backups |

## Problemas Conocidos

- `Dockerfile:23` — `COPY frontend/dist/ || true` no funciona en Dockerfile
- `docker-compose.prod.yml` — Frontend bound a `127.0.0.1:80` (no accesible externamente)
- `Dockerfile.dev` — Sin healthcheck, usa `npm install` en vez de `npm ci`

---

Tags: #devops #docker #contenedores
