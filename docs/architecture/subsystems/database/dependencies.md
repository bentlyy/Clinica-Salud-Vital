# SUB-15 — Dependencias

## Aristas internas

| Origen | → Destino | Tipo | Evidencia |
|---|---|---|---|
| `db.ts` | `pg` | import | `db.ts:1` |
| `db.ts` | `node:async_hooks` (ALS) | import | `db.ts:2` |
| `db.ts` | `utils/logger` | import | `db.ts:3` |
| `multi-tenant.service` | `db` (`pool`) | query | `multi-tenant.service.ts:62` |
| `tenant.middleware` | `db` (`tenantContext`) | set | `app.ts:190` (ver SUB-3) |
| `*.service.ts` | `db` (`pool`/`readPool`/`superAdminPool`) | query/connect | transversal |
| `init.sql` | `security.sql` | orden de carga | bootstrap |
| migraciones | `init.sql` | dependencia de esquema | `029` referencia init.sql |

## Depende de

- **SUB-3 (multi-tenancy):** RLS, roles, `tenantContext` — el aislamiento se apoya en `app.tenant_id`.
- **SUB-2 (auth):** `refresh_tokens`, `password_reset_tokens`, `user_sessions`.
- **SUB-7/8/6:** tablas PHI/lab/agenda.

## Es dependido por

- **Todos** los módulos backend; **jobs**; **seeds**; **tests de integración RLS**.

## Acoplamientos detectables

- El SQL inline en los servicios acopla lógica de negocio y esquema (sin repositorios).
- `tenantContext` (ALS) sólo se puebla en requests HTTP; **jobs/cron quedan sin contexto** (FND-D1, FND-G4).
- `defaultTenantId()` (`'default'`) es el fallback en el wrapper y en RLS (FND-B2/B7, FND-G2).
- `readPool`/`superAdminPool` hacen fallback **silencioso** a `pool` si faltan sus URLs (FND-G10).
