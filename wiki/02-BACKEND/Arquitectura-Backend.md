# Arquitectura Backend

> Estructura del backend y patrones de diseño.

## Estructura de Directorios

```
src/
├── app.ts                    # Entry point, middlewares, rutas, migraciones, seed, jobs
├── @types/                   # Type augmentations (Express)
├── modules/                  # 23 módulos (monolito modular)
│   ├── analytics/
│   ├── attachments/
│   ├── audit/
│   ├── auth/
│   ├── availability/
│   ├── billing/
│   ├── booking/
│   ├── calendar/
│   ├── clinical-record/      # + cie10, prescription, prescription-pdf
│   ├── clinical-templates/
│   ├── data-portability/
│   ├── doctor/
│   ├── guest/
│   ├── holidays/
│   ├── laboratory/           # + lab-events, lab-order-pdf, lab-result-email
│   ├── medical-history/
│   ├── notifications/
│   ├── reports/              # + report-pdf
│   ├── saas/
│   ├── specialties/
│   ├── super-admin/
│   ├── waitlist/
│   └── webhooks/
├── middlewares/              # Pipeline Express (11)
│   ├── auth.middleware.ts
│   ├── tenant.middleware.ts
│   ├── security.middleware.ts
│   ├── validate.middleware.ts
│   ├── errorHandler.middleware.ts
│   ├── requestLogger.middleware.ts
│   ├── sessionActivity.middleware.ts
│   ├── feature.middleware.ts
│   ├── asyncHandler.middleware.ts
│   ├── csrf.middleware.ts
│   └── correlationId.middleware.ts
├── shared/                    # Servicios compartidos (20)
│   ├── db.ts                  # Pool PostgreSQL + read replica + RLS session
│   ├── jwt.service.ts         # JWT HS256
│   ├── i18n.service.ts        # Traducciones server-side
│   ├── email.service.ts       # SendGrid > SMTP > log
│   ├── multi-tenant.service.ts
│   ├── crypto.service.ts      # AES-256-GCM
│   ├── stripe.service.ts
│   ├── queue.service.ts       # Cola sobre tabla jobs
│   ├── sessions.service.ts
│   ├── ownership.ts           # Checks BOLA
│   ├── booking-utils.ts
│   ├── booking-history.ts
│   ├── query.ts
│   ├── rut.ts
│   ├── sanitize.ts
│   ├── escape.ts
│   ├── base32.ts
│   ├── date.ts
│   ├── seed-status.ts
│   └── sentry.service.ts
├── jobs/                      # Cron jobs (2)
│   ├── reminder.job.ts
│   └── audit-integrity.job.ts
├── seed/
│   ├── admin.seed.ts
│   └── seed.ts
├── types/
│   ├── index.ts
│   └── modules.d.ts
└── utils/
    ├── logger.ts
    ├── errors.ts
    └── error-codes.ts
```

## Patrón por Módulo

```typescript
// module.controller.ts  → Handlers (asyncHandler)
// module.service.ts     → Business logic + DB
// module.routes.ts      → Router
// module.schema.ts      → Zod (opcional)
// module.email.ts       → Plantillas de email (opcional)
```

## Entry Point (`src/app.ts`)

El archivo `app.ts`:
1. Carga variables de entorno (dotenv) y valida la configuración de seguridad
2. Configura middlewares globales (Helmet, compression, CORS, cookie, JSON, CSRF, auth, tenant, activity, log, rate limits)
3. Monta rutas de los 23 módulos bajo `/api/<prefijo>`
4. Ejecuta migraciones SQL (init.sql si `users` no existe + 23 migraciones con tracking `_migrations`)
5. Inicia cron jobs (reminders, audit integrity)
6. Ejecuta seeds/backfills
7. Inicia servidor en puerto configurado (shutdown graceful sobre SIGTERM/SIGINT)

---

Tags: #backend #arquitectura #estructura