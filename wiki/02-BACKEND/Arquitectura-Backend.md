# Arquitectura Backend

> Estructura del backend y patrones de diseño. Sincronizado: 2026-11-02.

## Estructura de Directorios

```
src/
├── app.ts                    # Entry point, middlewares, guard SSO, rutas, migraciones, seed, jobs
├── @types/                   # Type augmentations (Express)
├── modules/                  # 24 módulos (monolito modular)
│   ├── analytics/
│   ├── attachments/
│   ├── audit/
│   ├── auth/                 # SSO + alta por invitación
│   ├── availability/
│   ├── billing/
│   ├── booking/
│   ├── calendar/
│   ├── clinical-record/      # + cie10, prescription, prescription-pdf
│   ├── clinical-templates/
│   ├── currencies/
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
├── middlewares/              # Pipeline Express (12)
│   ├── asyncHandler.middleware.ts
│   ├── auth.middleware.ts
│   ├── correlationId.middleware.ts
│   ├── csrf.middleware.ts
│   ├── errorHandler.middleware.ts
│   ├── feature.middleware.ts
│   ├── metrics.middleware.ts
│   ├── requestLogger.middleware.ts
│   ├── security.middleware.ts
│   ├── sessionActivity.middleware.ts
│   ├── tenant.middleware.ts
│   └── validate.middleware.ts
├── shared/                   # Servicios compartidos (23)
│   ├── db.ts                 # Pool PostgreSQL + read replica + RLS session
│   ├── jwt.service.ts        # Utilidades JWT (invitaciones)
│   ├── crypto.service.ts     # AES-256-GCM
│   ├── email.service.ts      # SendGrid > SMTP > log
│   ├── multi-tenant.service.ts
│   ├── mercadopago.service.ts
│   ├── queue.service.ts      # Cola sobre tabla jobs
│   ├── metrics.service.ts    # Prometheus
│   ├── cleanup.service.ts
│   ├── currencies.ts
│   ├── ownership.ts          # Checks BOLA
│   ├── booking-utils.ts
│   ├── booking-history.ts
│   ├── alerts.service.ts
│   ├── captcha.service.ts
│   ├── query.ts
│   ├── rut.ts
│   ├── sanitize.ts
│   ├── escape.ts
│   ├── date.ts
│   ├── i18n.service.ts
│   ├── seed-status.ts
│   └── sentry.service.ts
├── sso/                      # Integración SSO con el Core AMG
│   ├── amgSso.ts             # Guard + rutas /auth/*
│   ├── amgTypes.ts
│   └── localAccount.ts       # Identidad Core → cuenta local
├── jobs/                     # Cron jobs (2)
│   ├── reminder.job.ts
│   └── audit-integrity.job.ts
├── seed/
│   ├── admin.seed.ts
│   ├── seed.ts
│   └── seed-credentials.ts
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
2. Configura middlewares globales (Helmet, compression, CORS, cookie, JSON, **guard SSO**, CSRF, auth, tenant, activity, log, metrics, rate limits)
3. Monta rutas de los 24 módulos bajo `/api/<prefijo>`
4. Ejecuta migraciones SQL (init.sql si `users` no existe + 34 migraciones con tracking `_migrations`)
5. Inicia cron jobs (reminders, audit integrity) y la cola de jobs
6. Ejecuta seeds/backfills
7. Inicia servidor en puerto configurado (shutdown graceful sobre SIGTERM/SIGINT)

## Autenticación (SSO)

- `mountAmgAuthMiddleware()` corre a nivel de app y valida la cookie `app_session` del Core.
- Rutas públicas declaradas en `amgPublicPaths` (health, métricas, assets, guest, webhooks, planes, login).
- `amgRouter` expone `/api/auth/login`, `/api/auth/me` y `/api/auth/inicio`.
- `resolveLocalAccount()` vincula la identidad del Core con `users`/`tenants`.
- Solo queda lógica local de alta por invitación en `modules/auth/`.

---

Tags: #backend #arquitectura #estructura #sso
