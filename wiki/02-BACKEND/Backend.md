# Backend

Documentación del backend Express + TypeScript.

## Páginas

| Página | Descripción |
|--------|-------------|
| [[02-BACKEND/Arquitectura-Backend\|Arquitectura Backend]] | Estructura del backend, patrones |
| [[02-BACKEND/Middlewares\|Middlewares]] | Pipeline de middlewares Express |
| [[02-BACKEND/Shared-Services\|Servicios Compartidos]] | Servicios reutilizables (DB, JWT, email, etc.) |
| [[02-BACKEND/API-Reference\|Referencia de API]] | Todos los endpoints del sistema |
| [[02-BACKEND/Modulos/Modulos\|Módulos]] | Documentación de cada módulo (23) |

## Stack Backend

| Componente | Tecnología |
|------------|-----------|
| Runtime | Node.js 20 |
| Framework | Express 4.21 |
| Lenguaje | TypeScript 5.8 (strict) |
| Validación | Zod 4 |
| Base de Datos | pg (PostgreSQL raw SQL) + RLS |
| Auth | JWT (jsonwebtoken) + refresh tokens + 2FA TOTP + sesiones |
| Logging | Winston |
| Tareas CRON | node-cron |
| Cola | Tabla `jobs` (retry/backoff) — sin broker externo |
| Email | Nodemailer + SendGrid |
| PDF | PDFKit |
| Predictivo | `smaForecast()` — media móvil simple (sin TF.js) |
| Pagos | Stripe SDK (stub sin key) |
| Monitoreo | Sentry (opcional) |

## Backend en números

| Métrica | Valor |
|---------|-------|
| Archivos `src/` | 140 `.ts` |
| Módulos | 23 (`src/modules/`) |
| Middlewares | 11 |
| Shared services | 20 |
| Cron jobs | 2 |
| Endpoints | ~204 (202 routers + 2 health) |

---

Tags: #backend #indice