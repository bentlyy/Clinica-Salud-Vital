# Docker

> Configuración de contenedores para desarrollo y producción.

## Docker Compose

```yaml
services:
  db:
    image: postgres:15-alpine
    container_name: clinic-db
    restart: unless-stopped
    ports:
      - "127.0.0.1:5432:5432"
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-postgres}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-postgres}
      POSTGRES_DB: ${POSTGRES_DB:-clinic}
    volumes:
      - db_data:/var/lib/postgresql/data
      - ./db/init.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -d clinic"]
      interval: 5s
      timeout: 5s
      retries: 10

volumes:
  db_data:
```

## Dockerfile (Producción)

Multi-stage build:
1. **Builder**: Instala dependencias, compila TypeScript
2. **Runner**: Node 20 Alpine, solo producción, usuario no-root, health check

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json src/ ./
RUN npm run build:backend

FROM node:20-alpine AS runner
WORKDIR /app
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist/ dist/
COPY frontend/dist/ frontend/dist/
USER appuser
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1
CMD ["node", "dist/app.js"]
```

## Scripts de Backup

| Script | Propósito |
|--------|-----------|
| `scripts/backup.ps1` | Backup de DB en Windows |
| `scripts/backup-verify.sh` | Verificación de integridad de backups |

---

Tags: #devops #docker #contenedores
