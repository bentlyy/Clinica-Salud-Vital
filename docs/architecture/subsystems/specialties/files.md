# SUB-17 — Archivos

## Backend

| Archivo | Líneas | Rol |
|---|---|---|
| `src/modules/specialties/specialties.routes.ts` | 43 | Router; Zod inline; GET público; POST/PUT/DELETE admin |
| `src/modules/specialties/specialties.controller.ts` | 82 | Controllers; `resolveTenant`/`runInTenantScope` |
| `src/modules/specialties/specialties.service.ts` | 170 | CRUD, `ensureSpecialty`, agrupación doctores |
| `src/modules/currencies/currencies.routes.ts` | 8 | `GET /rates` |
| `src/modules/currencies/currencies.controller.ts` | 12 | `getExchangeRates` |
| `src/shared/currencies.ts` | 100 | Países, tasas, conversión |
| `src/app.ts` | — | Montaje `:279` (`/api/specialties`), `:281` (`/api/currencies`); `refreshRates` (boot/cron `:512`) |

## Base de datos

| Archivo | Elementos |
|---|---|
| `db/init.sql` | Tabla `specialties` (`:404-416`) + `UNIQUE (tenant_id, name)` |
| `db/migrations/001_add_specialty_columns.sql` | Columnas `icon/description/department/procedures/color` + backfill |

## Frontend

| Archivo | Rol |
|---|---|
| `frontend/src/modules/specialties/pages/SpecialtiesPage.tsx` | Página del catálogo |
| `frontend/src/modules/specialties/components/*` (8) | Formulario, fila, filtros, stats, estados, visuales |
| `frontend/src/modules/specialties/hooks/useSpecialties.ts` | Hooks |
| `frontend/src/modules/specialties/services/specialty.service.ts` | API layer |
| `frontend/src/modules/specialties/types/specialty.types.ts` | Tipos |

## Tests

- Sin tests dedicados detectados para specialties/currencies (NO VERIFICADO en detalle).
