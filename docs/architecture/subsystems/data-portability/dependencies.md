# SUB-14 — Dependencias

## Backend — externas

| Dependencia | Uso |
|---|---|
| `crypto` (node) | `randomBytes` (secreto) + `createHmac('sha256')` (firma) |
| `express` | Routers/controllers |
| `pg` | Consultas a `webhook_subscriptions`, export |

## Backend — internas

| Origen | Destino | Nota |
|---|---|---|
| `data-portability.controller` | `data-portability.service`, `utils/errors`, `utils/error-codes` | Export + ownership |
| `webhooks.controller` | `webhooks.service` | CRUD |
| `webhooks.service` | `shared/queue.service.enqueueJob` | `dispatchEvent` encola `webhook:dispatch` |
| `webhooks.service` | `shared/queue.service.registerWorker` | `registerWebhookWorker` |
| `webhooks.service` | `fetch` (global) | Entrega HTTP con `AbortSignal.timeout(10000)` |
| `queue.service.registerWorkers` | `webhooks.service.registerWebhookWorker` | `require` dinámico (`:151-152`) |
| `app.ts` | `data-portability.routes` (`:288`), `webhooks.routes` (`:289`) | Montaje |

## Base de datos

| Objeto | Uso |
|---|---|
| `webhook_subscriptions` | Persistencia de suscripciones (RLS por tenant) |
| `webhook_deliveries` | **Definida pero no usada por el código** (FND-N5) |
| `jobs` | Cola de entregas (`webhook:dispatch`) |
| `users`, `bookings`, `clinical_records`, `medical_history`, `lab_requests`, `invoices`, `prescriptions`, `attachments` | Fuentes del export |

## Variables de entorno

| Variable | Uso |
|---|---|
| `ENCRYPTION_KEY` | Disponible para cifrar secretos — **no usada** aquí (FND-N2) |
| `DATABASE_URL` | Conexión del pool (export/CRUD) |

## Cross-ref

- **SUB-6/SUB-7/SUB-8/SUB-11 (booking/clinical/lab/billing)**: deberían invocar `dispatchEvent` en sus eventos (hoy **no** lo hacen — FND-N1).
- **SUB-13 (auditoría)**: el export de PHI no se audita (FND-N4/M2).
- **SUB-15 (BD)**: drift `init.sql` vs migración 017 (FND-N9, FND-G1).
- **SUB-16 (infra)**: cola `jobs` y worker.
