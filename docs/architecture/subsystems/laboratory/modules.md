# SUB-8 — Módulos y capas

| ID | Unidad | Tipo | Archivo | Responsabilidad | LOC |
|---|---|---|---|---|---|
| SUB8-U1 | laboratory.routes | Router | `src/modules/laboratory/laboratory.routes.ts` | 46 endpoints + roles + feature gate | 101 |
| SUB8-U2 | laboratory.controller | Controller | `src/modules/laboratory/laboratory.controller.ts` | Orquestación, ownership, SSE, eventos | 395 |
| SUB8-U3 | laboratory.service | Service | `src/modules/laboratory/laboratory.service.ts` | Dominio completo (catálogo, órdenes, muestras, QC, equipos, reactivos, notificaciones, dashboards) | 1022 |
| SUB8-U4 | laboratory.schema | Validación | `src/modules/laboratory/laboratory.schema.ts` | Zod `createLabRequestSchema` + `labRequestIdSchema` | 14 |
| SUB8-U5 | lab-result-email.service | Service | `src/modules/laboratory/lab-result-email.service.ts` | Resultados por email + token público | 135 |
| SUB8-U6 | lab-order-pdf.service | Service | `src/modules/laboratory/lab-order-pdf.service.ts` | PDF de la orden médica (pdfkit) | 119 |
| SUB8-U7 | lab-events.service | Shared/EventBus | `src/modules/laboratory/lab-events.service.ts` | Canales por tenant + emit/on/off | 33 |

## Notas

- **SUB8-U3 (`laboratory.service`)** es el archivo más grande del módulo (1022 líneas) y agrupa **8 dominios** distintos (catálogo, órdenes, muestras, resultados/validación, áreas, QC, equipos, reactivos, notificaciones, dashboard/analytics) → candidato claro a descomposición por subdominio (FND-E3, ver `files.md`).
- **SUB8-U2 (`controller`)** aplica ownership solo en 2 handlers (`getLabRequestById`, `downloadLabOrderPDF`); el resto confía en `authorize()` por rol (FND-E1).
- **SUB8-U7 (`lab-events`)** es un singleton en proceso (`EventEmitter`): el fan-out SSE **no funciona con varias instancias** (no hay Redis/pub-sub).
- Solo **SUB8-U4** valida entrada con Zod; el resto de endpoints reciben `req.body` sin esquema (status, muestras, QC, equipos, reactivos) → validación de entrada parcial (FND-E3).

## Patrón general

Route → Controller → Service consistente, con 3 servicios auxiliares extraídos (email, PDF, eventos) más 1 schema Zod mínimo. El catálogo de tablas `lab_*` se reparte entre todos los niveles sin un repositorio dedicado; todo el SQL vive inline en `laboratory.service.ts`.

## Diferencia con otros módulos auditados

A diferencia de SUB-6/SUB-7 (que separan un módulo por dominio), **SUB-8 concentra 10 tablas y ~30 operaciones en un único service** sin capa de repositorio, y con **validación de entrada casi nula** fuera de la creación de la orden.
