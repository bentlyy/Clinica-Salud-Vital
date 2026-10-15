# SUB-17 — Módulos

> Backend: `SUB17-U1..U5`. Frontend: `MOD-f-specialties`.

## Backend

| ID | Unidad | Tipo | Archivo | Responsabilidad |
|---|---|---|---|---|
| SUB17-U1 | specialties.routes | Router | `src/modules/specialties/specialties.routes.ts` | GET público; POST/PUT/DELETE admin; Zod inline |
| SUB17-U2 | specialties.controller | Controller | `src/modules/specialties/specialties.controller.ts` | `resolveTenant` (superadmin override), `runInTenantScope` |
| SUB17-U3 | specialties.service | Service | `src/modules/specialties/specialties.service.ts` | CRUD, `ensureSpecialty`, agrupación de doctores |
| SUB17-U4 | currencies.routes/controller | Router | `src/modules/currencies/{currencies.routes,currencies.controller}.ts` | `GET /rates` (público) |
| SUB17-U5 | currencies (shared) | Infra | `src/shared/currencies.ts` | Países, tasas en caché, `refreshRates`, `convertFromUsd` |

## Frontend (`MOD-f-specialties`, 12 archivos)

| Unidad | Tipo | Archivo | Responsabilidad |
|---|---|---|---|
| MOD-f-specialties | SpecialtiesPage | Página | `frontend/src/modules/specialties/pages/SpecialtiesPage.tsx` | Listado + stats + filtros + CRUD |
| MOD-f-specialties | SpecialtyFormModal/Row/… | Componentes | `frontend/src/modules/specialties/components/*` | Formulario, fila, filtros, estados, visuales |
| MOD-f-specialties | useSpecialties | Hook | `frontend/src/modules/specialties/hooks/useSpecialties.ts` | Queries/mutations |
| MOD-f-specialties | specialty.service | Service | `frontend/src/modules/specialties/services/specialty.service.ts` | `GET/POST/PUT/DELETE /specialties`; filtra `search` en cliente |
| MOD-f-specialties | specialty.types | Tipos | `frontend/src/modules/specialties/types/specialty.types.ts` | Tipos del catálogo |

## Endpoints por unidad

- **U1/U2**: `GET/POST /api/specialties`, `GET/PUT/DELETE /api/specialties/:id`.
- **U4**: `GET /api/currencies/rates`.

## Observaciones de módulo

- Zod de especialidades declarado **inline** en el router (schema duplicado create/update) — cross-ref FND-C10 (patrón).
- `tenant_id` está en el schema de escritura pero sólo lo aplica el superadmin (campo efectivamente muerto para admin) — FND-O4.
- El service frontend obtiene un array del backend y **finge paginación** (`total=length, totalPages=1`) y filtra `search` en cliente — FND-O2.
- Sin módulo frontend de monedas (sólo la landing lo consume — NO VERIFICADO).
