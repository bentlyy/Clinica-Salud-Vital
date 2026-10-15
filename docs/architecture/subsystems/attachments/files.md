# SUB-9 — Inventario de archivos

## Backend (propios)

| Archivo | LOC | ID | Tipo | Entry/Exit |
|---|---|---|---|---|
| `src/modules/attachments/attachments.routes.ts` | 15 | MOD-b-attach-route | Router | `app.ts:63` import → `app.ts:287` mount `/api/attachments` |
| `src/modules/attachments/attachments.controller.ts` | 66 | MOD-b-attach-controller | Controllers | importado por routes |
| `src/modules/attachments/attachments.service.ts` | 278 | MOD-b-attach-service | Service+FS+SQL | importado por controller |
| `src/modules/attachments/attachments.schema.ts` | 18 | MOD-b-attach-schema | Zod | importado por routes |
| `src/modules/clinical-record/prescription-pdf.service.ts` | ~ | PDF | pdfkit | importado por `clinical-record.controller.ts:9` |
| `src/modules/laboratory/lab-order-pdf.service.ts` | ~ | PDF | pdfkit | import dinámico `laboratory.controller.ts:141` |
| `src/modules/reports/report-pdf.service.ts` | ~ | PDF | pdfkit | import dinámico `report.controller.ts:37` |
| `src/types/modules.d.ts` | 33 | MOD-types-pdfkit | Tipos | declaración módulo `pdfkit` |

## Backend (consumidos)

| Archivo | ID | Rol | Evidencia |
|---|---|---|---|
| `src/shared/db.ts` | SVC-db | `pool` (RLS) | service |
| `src/modules/doctor/doctor.service.ts` | MOD-b-doctor-service | `getDoctorByUserId` (resolver `doctor_id`) | `attachments.controller.ts:6,10` |
| `src/utils/errors.ts` | ERR-utils | `BadRequestError/NotFoundError/ForbiddenError` | service |
| `src/middlewares/auth.middleware.ts` | MW-auth | `authMiddleware`,`authorize` | routes |
| `src/middlewares/validate.middleware.ts` | MW-validate | `validateZod` | routes |
| `src/middlewares/asyncHandler.middleware.ts` | MW-async | `asyncHandler` | controller |

## Frontend

| Archivo | LOC | ID | Tipo |
|---|---|---|---|
| `frontend/src/modules/attachments/components/AttachmentsList.tsx` | — | MOD-f-attach-list | Lista de adjuntos (upload/delete) |
| `frontend/src/modules/attachments/hooks/useAttachments.ts` | — | MOD-f-attach-hooks | `useAttachments`, `useUploadAttachment`, `useDeleteAttachment` |
| `frontend/src/modules/attachments/*` (types/service) | — | MOD-f-attach | Service/tipos |

## Tablas

`attachments` (`tenant_id, entity_type, entity_id, original_name, stored_name, mime_type, size_bytes, uploaded_by, created_at`). FK lógica a entidades por `(entity_type, entity_id)` — sin FK física (cross-ref FND-G3).

## Almacenamiento

`UPLOAD_ROOT = process.env.UPLOAD_DIR || <cwd>/uploads` (FS local; usado también por `saas/onboarding.service.ts:11`).

## npm

`pdfkit` (PDF), `fs`, `path`, `crypto` (Node core).
