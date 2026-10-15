# SUB-14 — Módulos

> Backend: `SUB14-U1..U9`.

## Portabilidad de datos

| ID | Unidad | Tipo | Archivo | Responsabilidad |
|---|---|---|---|---|
| SUB14-U1 | data-portability.routes | Router | `src/modules/data-portability/data-portability.routes.ts` | `GET /me`; `GET /patients/:patientId` |
| SUB14-U2 | data-portability.controller | Controller | `src/modules/data-portability/data-portability.controller.ts` | Ownership de paciente; cabecera de descarga; `res.json({ data })` |
| SUB14-U3 | data-portability.service | Service | `src/modules/data-portability/data-portability.service.ts` | Export agregado (users/bookings/records/history/lab/invoices/prescriptions/attachments), redacción |
| SUB14-U4 | data-portability.schema | Zod | `src/modules/data-portability/data-portability.schema.ts` | `exportPatientParamsSchema` (`patientId` positivo) |

## Webhooks

| ID | Unidad | Tipo | Archivo | Responsabilidad |
|---|---|---|---|---|
| SUB14-U5 | webhooks.routes | Router | `src/modules/webhooks/webhooks.routes.ts` | CRUD; guard admin/superadmin |
| SUB14-U6 | webhooks.controller | Controller | `src/modules/webhooks/webhooks.controller.ts` | list/create/update/delete |
| SUB14-U7 | webhooks.service | Service | `src/modules/webhooks/webhooks.service.ts` | Validación URL/eventos; `dispatchEvent`; `dispatchWebhook`; worker |
| SUB14-U8 | webhooks.schema | Zod | `src/modules/webhooks/webhooks.schema.ts` | `WEBHOOK_EVENTS`; `create/update/Id` schemas (`.strict()`) |
| SUB14-U9 | queue.service (webhook worker) | Infra | `src/shared/queue.service.ts` | `registerWorkers()` → `registerWebhookWorker()` (`:151-152`) |

## Endpoints por unidad

- **U1/U2**: `GET /api/export/me`, `GET /api/export/patients/:patientId`.
- **U5/U6**: `GET/POST /api/webhooks`, `PUT/DELETE /api/webhooks/:id`.

## Observaciones de módulo

- `dispatchEvent` (U7) sin invocadores → pipeline de webhooks inerte (FND-N1).
- `webhook_deliveries` (DB) no referenciada por ningún módulo (FND-N5).
- Secreto en claro (FND-N2); SSRF parcial por redirecciones (FND-N3).
- No hay módulo frontend dedicado para webhooks ni para `/export` (posible UI en settings/admin — NO VERIFICADO).
