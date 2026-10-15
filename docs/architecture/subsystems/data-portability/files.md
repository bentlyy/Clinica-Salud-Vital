# SUB-14 — Archivos

## Backend

| Archivo | Líneas | Rol |
|---|---|---|
| `src/modules/data-portability/data-portability.routes.ts` | 13 | Router export |
| `src/modules/data-portability/data-portability.controller.ts` | 28 | Controllers export |
| `src/modules/data-portability/data-portability.service.ts` | 150 | Agregación + redacción |
| `src/modules/data-portability/data-portability.schema.ts` | 5 | Zod params |
| `src/modules/webhooks/webhooks.routes.ts` | 17 | Router webhooks |
| `src/modules/webhooks/webhooks.controller.ts` | 23 | Controllers webhooks |
| `src/modules/webhooks/webhooks.service.ts` | 213 | Lógica + dispatch + worker |
| `src/modules/webhooks/webhooks.schema.ts` | 26 | Zod + eventos |
| `src/shared/queue.service.ts` | 181 | Cola + `registerWorkers()` |
| `src/app.ts` | — | Montaje `:288` (`/api/export`), `:289` (`/api/webhooks`) |

## Base de datos

| Archivo | Elementos |
|---|---|
| `db/migrations/017_webhook_subscriptions.sql` | Tabla `webhook_subscriptions` (+ `uq_webhook_sub_tenant_url`), índice |
| `db/init.sql` | `webhook_subscriptions` (`:645-655`), `webhook_deliveries` (`:657-670`), índices (`:908,911,954`) |
| `db/security.sql` | RLS sobre `webhook_subscriptions`, `webhook_deliveries` (arrays de tablas tenant) |

## Frontend

- Sin módulo dedicado detectado para webhooks ni para `/export`. Posible UI en `frontend/src/modules/settings` (NO VERIFICADO).

## Tests

- Sin tests dedicados detectados para data-portability/webhooks.
