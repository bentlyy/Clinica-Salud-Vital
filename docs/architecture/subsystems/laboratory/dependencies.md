# SUB-8 — Dependencias

## Aristas internas (dentro del módulo)

| Origen | Destino | Qué | Evidencia |
|---|---|---|---|
| `laboratory.routes` | `auth.middleware` | `authMiddleware`, `authorize` | `laboratory.routes.ts:2,29,34-99` |
| `laboratory.routes` | `feature.middleware` | `requireFeature('laboratory')` | `laboratory.routes.ts:3,30` |
| `laboratory.routes` | `validate.middleware` | `validateZod` | `laboratory.routes.ts:4,95,97-99` |
| `laboratory.routes` | `laboratory.controller` | 46 handlers | `laboratory.routes.ts:6-23` |
| `laboratory.routes` | `laboratory.schema` | 2 schemas | `laboratory.routes.ts:5` |
| `laboratory.controller` | `laboratory.service` | dominio | `laboratory.controller.ts:1` |
| `laboratory.controller` | `lab-result-email.service` | resultados por email/token | `laboratory.controller.ts:2,185,190,198` |
| `laboratory.controller` | `doctor.service` | `getDoctorByUserId` | `laboratory.controller.ts:3,63,93,103,135` |
| `laboratory.controller` | `lab-events.service` | `emitLabEvent`, `onLabEvent`, `LAB_EVENTS` | `laboratory.controller.ts:8,108-160,379-384` |
| `laboratory.controller` | `lab-order-pdf.service` | `generateLabOrderPDF` (import dinámico) | `laboratory.controller.ts:141-142` |
| `laboratory.service` | `shared/db` | `pool`, `readPool` | `laboratory.service.ts:1` |
| `laboratory.service` | `notification.service` | `createNotification` | `laboratory.service.ts:4,762` |
| `lab-result-email.service` | `shared/jwt.service` | `signInvite`, `verify` | `lab-result-email.service.ts:4,77,130` |
| `lab-result-email.service` | `shared/queue.service` | `enqueueJob('email:send')` | `lab-result-email.service.ts:5,118` |
| `lab-result-email.service` | `shared/db` | `pool` | `lab-result-email.service.ts:1` |
| `lab-order-pdf.service` | `pdfkit` + `shared/db` | `PDFDocument`, `pool` | `lab-order-pdf.service.ts:1-2` |

## Depende de (otros subsistemas)

- **SUB-2/SUB-3**: `authMiddleware`/`authorize`, contexto de tenant y RLS, `requireFeature`.
- **SUB-5** (`doctor`): `getDoctorByUserId` (dueño de la orden, ownership de lectura).
- **SUB-13** (notificaciones): `createNotification` in-app al entregar resultados.
- **SUB-10/JOB** (`queue.service`/`email.service`): entrega del email de resultados (con `tenantId`).

## Es dependido por

- **SUB-7** (clinical): `clinical-record.service` crea `lab_requests`/`lab_request_items` (puente ficha↔laboratorio); `GET /clinical-records/:id/lab-results` lee `lab_requests+items+tests`.
- **SUB-11** (billing): `lab_tests.price` alimenta el cálculo de ingresos del laboratorio (`getAnalyticsData.total_revenue`).
- **Frontend** (SUB-1): páginas de laboratorio (órdenes, resultados, muestras, QC, dashboards, `my-laboratory`, `lab-results?token=`).
- **super-admin / data-portability / reports / attachments**: según el barrido de dependencias de Fase 0.

## Riesgos de acoplamiento

- **`EventEmitter` in-process** (`lab-events.service`) acopla el SSE a una única instancia; no escala horizontalmente (no hay pub/sub externo).
- **`lab_tests.price`** se usa como única fuente de ingresos analíticos, aunque el precio cobrado podría diferir (acoplamiento catálogo↔facturación).
- **`lab_result_history`** (tabla) vs **`getItemHistory`** (cálculo en vivo): dos mecanismos de historial desincronizados; solo uno se usa (FND-E4).
- **Envío de resultados** (`lab-result-email.service`) reutiliza `enqueueJob`/`sendEmail` sin ownership → acopla la entrega pública con el dominio de órdenes (FND-E1).

## Dependencias circulares

Ninguna detectada. `clinical-record.service` → laboratorio (creación); laboratorio **no** importa `clinical-record`. `laboratory.service` → `notifications`; sin retorno.
