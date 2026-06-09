# Arquitectura

## Vista General

```
src/
├── app.ts                    # Entry point
├── middlewares/               # Pipeline Express
├── modules/                   # 14 módulos (monolito modular)
│   ├── auth/
│   ├── booking/
│   ├── doctor/
│   ├── availability/
│   ├── exception/
│   ├── guest/
│   ├── confirmation/
│   ├── clinical-record/
│   ├── analytics/
│   ├── billing/
│   ├── laboratory/
│   ├── audit/
│   ├── rbac/
│   ├── ml/
│   └── saas/
├── shared/                    # db.ts, jwt.ts, etc.
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
- Refresh de tenants cada 5 min desde DB
