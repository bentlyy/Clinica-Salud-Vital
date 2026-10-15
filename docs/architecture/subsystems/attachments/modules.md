# SUB-9 — Módulos y capas

## Adjuntos

| ID | Unidad | Tipo | Archivo | Responsabilidad | LOC |
|---|---|---|---|---|---|
| SUB9-U1 | attachments.routes | Route | `src/modules/attachments/attachments.routes.ts` | 4 rutas `/api/attachments` (auth + authorize) | 15 |
| SUB9-U2 | attachments.controller | Controller | `src/modules/attachments/attachments.controller.ts` | Resuelve `doctor_id`, stream de descarga | 66 |
| SUB9-U3 | attachments.service | Service | `src/modules/attachments/attachments.service.ts` | Ownership, validación MIME/tamaño, FS, SQL `attachments` | 278 |
| SUB9-U4 | attachments.schema | Schema (Zod) | `src/modules/attachments/attachments.schema.ts` | `uploadAttachmentSchema`, `listAttachmentsSchema`, `attachmentIdSchema` | 18 |

## Servicios PDF (compartidos, en módulos dueños)

| ID | Unidad | Tipo | Archivo | Responsabilidad |
|---|---|---|---|---|
| SUB9-U5 | prescription-pdf.service | PDF (pdfkit) | `src/modules/clinical-record/prescription-pdf.service.ts` | `generatePrescriptionPDF(id, tenantId)` |
| SUB9-U6 | lab-order-pdf.service | PDF (pdfkit) | `src/modules/laboratory/lab-order-pdf.service.ts` | `generateLabOrderPDF(id, tenantId)` |
| SUB9-U7 | report-pdf.service | PDF (pdfkit) | `src/modules/reports/report-pdf.service.ts` | `generateReportPDF(report, tenantId)` |
| SUB9-U8 | types/modules.d.ts | Tipos | `src/types/modules.d.ts` | Declaración mínima de `pdfkit` (`PDFDocument`) |

## Capas

`routes` (auth/authorize/validate) → `controller` (resuelve `doctor_id` vía `doctor.service.getDoctorByUserId`, streaming) → `service` (ownership + SQL + FS). Los servicios PDF son **funciones puras** que devuelven `Buffer`, invocados desde los controllers de sus módulos, que aplican el control de ownership de dominio.

## Tipos clave

- `AttachmentInput`, `AttachmentRecord`, `OwnershipResult` (`attachments.service.ts:12-149`).
- `ALLOWED_MIME`, `ALLOWED_ENTITIES`, `MAX_FILE_BYTES` (`attachments.service.ts:103-126`).

## Notas

- Ownership centralizado (`getEntityOwnership`+`assertOwnership`) → buena defensa IDOR.
- `entity_type: 'lab_result'` en realidad resuelve la tabla `lab_requests` (nomenclatura heredada).
- Servicios PDF comparten patrón `new PDFDocument({margin:50})` y `doc.end()` con acumulación de chunks.
