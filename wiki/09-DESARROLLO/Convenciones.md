# Convenciones

> Estándares de código y estilo del proyecto.

## Backend

### Estructura de Módulo

```
module/
├── module.controller.ts   # Handlers Express
├── module.service.ts      # Lógica de negocio
├── module.routes.ts       # Router
├── module.schema.ts       # Zod (opcional)
└── (opcional)
    ├── module.email.ts
    └── module.middleware.ts
```

### Convenciones de Código

| Regla | Estándar |
|-------|----------|
| Nombres archivos | `snake-case.ts` (kebab) |
| Nombres clases/funciones | `camelCase` |
| Nombres tipos/interfaces | `PascalCase` |
| Imports | ES modules (`import/export`) |
| Async handlers | Envueltos en `asyncHandler` |
| Validación | Zod schemas |
| Errores | Clases personalizadas en `utils/errors.ts` |
| Logging | Winston (`utils/logger.ts`) |

### API

| Regla | Convención |
|-------|-----------|
| Prefijo | `/api` |
| Paginación | `{ data, pagination: { page, limit, total, totalPages } }` |
| Errores | `{ error, details, stack }` |
| Auth | `Authorization: Bearer <token>` |
| Tenant | Header `X-Tenant-Id` |
| Límite paginación | Máx 100 items |

## Base de Datos

| Regla | Convención |
|-------|-----------|
| Nombres tablas | `snake_case` plural |
| Nombres columnas | `snake_case` |
| Primary keys | `id SERIAL PRIMARY KEY` |
| Foreign keys | `fk_tabla_columna` |
| Índices | `idx_tabla_columnas` |
| Timestamps | `created_at`, `updated_at` |
| Multi-tenant | `tenant_id TEXT NOT NULL` |

## Frontend

| Regla | Estándar |
|-------|----------|
| Componentes | PascalCase.tsx |
| Hooks | camelCase.js |
| API modules | camelCase.js |
| Context | PascalCase.tsx |
| Estilos | CSS modules o ui.css |
| Lazy loading | `React.lazy()` para páginas |

---

Tags: #desarrollo #convenciones #estandar
