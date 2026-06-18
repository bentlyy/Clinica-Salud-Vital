# Arquitectura Backend

> Estructura del backend y patrones de diseño.

## Estructura de Directorios

```
src/
├── app.ts                    # Entry point, middlewares, rutas
├── modules/                  # 14 módulos (monolito modular)
│   ├── analytics/
│   ├── audit/
│   ├── auth/
│   ├── availability/
│   ├── billing/
│   ├── booking/
│   ├── clinical-record/
│   ├── doctor/
│   ├── guest/
│   ├── laboratory/
│   ├── patient/              # (vacío)
│   ├── saas/
│   ├── specialties/
│   └── super-admin/
├── middlewares/               # Pipeline Express (9)
│   ├── auth.middleware.ts
│   ├── tenant.middleware.ts
│   ├── security.middleware.ts
│   ├── validate.middleware.ts
│   ├── errorHandler.middleware.ts
│   ├── requestLogger.middleware.ts
│   ├── sessionActivity.middleware.ts
│   ├── feature.middleware.ts
│   └── asyncHandler.middleware.ts
├── shared/                    # Servicios compartidos (17)
│   ├── db.ts                  # Pool PostgreSQL
│   ├── jwt.service.ts         # JWT secret getter
│   ├── i18n.service.ts        # Traducciones
│   ├── email.service.ts       # Nodemailer
│   ├── multi-tenant.service.ts
│   ├── crypto.service.ts
│   ├── stripe.service.ts
│   ├── queue.service.ts
│   ├── booking-utils.ts
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
└── types/
    ├── index.ts
    └── modules.d.ts
```

## Patrón por Módulo

```typescript
// module.controller.ts  → Handlers (asyncHandler)
// module.service.ts     → Business logic + DB
// module.routes.ts      → Router
// module.schema.ts      → Zod (opcional)
```

## Entry Point (`src/app.ts`)

El archivo `app.ts`:
1. Carga variables de entorno (dotenv)
2. Valida configuración de seguridad
3. Configura middlewares globales
4. Monta rutas de cada módulo bajo `/api/<prefijo>`
5. Inicia cron jobs
6. Ejecuta seed automático en desarrollo
7. Inicia servidor en puerto configurado

---

Tags: #backend #arquitectura #estructura
