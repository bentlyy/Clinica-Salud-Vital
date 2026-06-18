# Monitoreo

> Logging, health checks y error tracking.

## Logging (Winston)

- Logger estructurado configurado en `src/utils/logger.ts`
- Nivel configurable vía `LOG_LEVEL` (default: `info`)
- Directorio de logs: `LOG_DIR` (default: `logs/`)

## Health Check

Endpoint: `GET /health`
- Retorna estado de la aplicación y conexión a DB
- Usado por Docker HEALTHCHECK y Render

## Error Tracking (Sentry)

- SDK: `@sentry/node`
- Configurable vía `SENTRY_DSN`
- Muestreo: `SENTRY_TRACES_SAMPLE_RATE` (default: 0.1)
- Captura errores no manejados en producción

## Monitoreo de Memoria

- `--max-old-space-size=400` limita heap de Node.js
- Middleware rastrea RSS/heap por request
- PM2 reinicia automáticamente al alcanzar umbral (en producción)

---

Tags: #devops #monitoreo #logging #sentry
