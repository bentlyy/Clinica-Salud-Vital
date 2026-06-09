# Arquitectura

## Vista General

```
src/
├── app.ts                    # Entry point
├── middlewares/               # Pipeline Express
├── modules/                   # 23 módulos (monolito modular)
│   ├── analytics/
│   ├── audit/
│   ├── auth/
│   ├── availability/
│   ├── billing/
│   ├── booking/
│   ├── clinical-record/
│   ├── compliance/            # GDPR, portabilidad, borrado
│   ├── doctor/
│   ├── exception/
│   ├── fhir/                  # Interoperabilidad FHIR
│   ├── guest/
│   ├── i18n/                  # Traducciones multi-idioma
│   ├── laboratory/
│   ├── ml/
│   ├── monitoring/            # Health, métricas, DB stats
│   ├── notification/          # Canal único (email/sms/whatsapp)
│   ├── patient/               # (placeholder)
│   ├── rbac/
│   ├── saas/
│   ├── specialties/           # Catálogo de especialidades
│   ├── super-admin/           # Gestión global de tenants
│   └── webhook/
├── shared/                    # db.ts, jwt.ts, i18n.service.ts, multi-tenant.service.ts, stripe.service.ts, booking-utils.ts, notification.service.ts, query.ts, usage.middleware.ts
├── utils/                     # logger.ts, errors.ts
├── jobs/                      # Cron jobs
└── seed/                      # Seeds
```

## Pipeline de Middleware

```
Security (Helmet + HPP)
  → CORS
    → Compression
      → Request Logger
        → Rate Limit
          → Auth (JWT)
            → Role (admin/doctor/user)
              → Validate (Zod)
                → Audit
                  → Handler
```

## Convenciones

### Módulo
Cada módulo sigue:
```
module/
├── module.controller.ts   # Handlers (asyncHandler)
├── module.service.ts      # Business logic + DB
├── module.routes.ts       # Router
├── module.schema.ts       # Zod validation
```

### API
- Versionado: `/api/v1/`
- Paginación: `{ data, pagination: { page, limit, total, totalPages } }`
- Errores: `{ error, details, stack }`
- Auth: `Authorization: Bearer <token>`

## Multi-tenancy
- Shared DB con `tenant_id` en todas las tablas
- Aislamiento via `WHERE tenant_id = ?`
- JWT incluye `tenant_id`
- Refresh de tenants cada 5 min desde DB (`multi-tenant.service.ts`)

## Shared Modules
| Archivo | Propósito |
|---------|-----------|
| `db.ts` | Pool PostgreSQL (single instance) |
| `jwt.ts` | JWT secret getter |
| `rut.ts` | Validación RUT chileno |
| `email.service.ts` | Transporte Nodemailer |
| `i18n.service.ts` | 421+ claves × 4 locales |
| `multi-tenant.service.ts` | Carga/refresh tenants |
| `stripe.service.ts` | Stripe wrapper (stub mode) |
| `booking-utils.ts` | Validación de slots compartida |
| `notification.service.ts` | Notificaciones multicanal |
| `query.ts` | Helpers getQueryInt/Str |
| `usage.middleware.ts` | Tracking de uso por tenant |
