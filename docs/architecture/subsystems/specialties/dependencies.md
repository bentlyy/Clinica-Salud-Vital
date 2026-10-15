# SUB-17 — Dependencias

## Backend — externas

| Dependencia | Uso |
|---|---|
| `express` | Routers/controllers |
| `pg` | Consultas a `specialties`, `doctors` |
| `zod` | Schemas (inline en router) |
| `fetch` (global) | `refreshRates` → `open.er-api.com` |

## Backend — internas

| Origen | Destino | Nota |
|---|---|---|
| `specialties.controller` | `shared/db.tenantContext` | `runInTenantScope` (superadmin escribe en otro tenant) |
| `specialties.service` | `shared/db.pool` / `superAdminPool` | Lectura normal vs `crossTenant` (superadmin) |
| `doctor.service` | `specialties.service.ensureSpecialty` | Auto-creación de especialidad (`doctor.service.ts:66,155`) |
| `currencies.controller` | `shared/currencies.getRates` | Tasas |
| `app.ts` | `shared/currencies.refreshRates` | Boot + cron 6h (`:512`) |
| `billing`/`super-admin` | `shared/currencies.convertFromUsd` | Conversión USD→local |

## Base de datos

| Objeto | Uso |
|---|---|
| `specialties` | Catálogo por tenant (RLS) |
| `doctors` | Fuente de `doctors[]` por especialidad |

## Variables de entorno

| Variable | Uso |
|---|---|
| `DEFAULT_TENANT_ID` | Tenant por defecto para rutas públicas sin header |
| `APP_LOCALE` | Locale por defecto |

## Cross-ref

- **SUB-5 (usuarios/doctores)**: `ensureSpecialty` en alta/actualización de doctor.
- **SUB-11 (billing)**: `convertFromUsd`/`getRates` (cross-ref FND-H12).
- **SUB-3 (multi-tenancy)**: `X-Tenant-Id` público (FND-O1) y `DEFAULT 'default'`.
- **SUB-19 (landing)**: consumo público de especialidades y tasas (NO VERIFICADO).
