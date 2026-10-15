# SUB-9 — Documentos, PDF y adjuntos

> **Estado:** AS-IS completado · **Certeza global:** confirmado (lectura de código).
> **Evidencia principal:** `src/modules/attachments/*` (subida/listado/descarga/borrado de adjuntos) y los servicios PDF con `pdfkit`: `clinical-record/prescription-pdf.service.ts`, `laboratory/lab-order-pdf.service.ts`, `reports/report-pdf.service.ts`.

## 1. Propósito

- **Adjuntos**: almacenar archivos (imágenes, PDF, Office, texto, DICOM) ligados a entidades clínicas (`clinical_record`, `prescription`, `lab_result`, `booking`, `medical_history`, `patient`) con verificación de propiedad por rol.
- **Generación de PDF** server-side con `pdfkit`: receta médica, orden de exámenes de laboratorio e informes/reportes. Los endpoints PDF viven en sus módulos dueños (SUB-7 clinical, SUB-8 lab, SUB-12 reports); SUB-9 documenta el mecanismo común.

## 2. Componentes

| Capa | Módulo | Rol |
|---|---|---|
| HTTP adjuntos | `attachments.routes/controller/service` | Subida (base64), listado, descarga (stream) y borrado |
| PDF | `prescription-pdf.service.ts` | `generatePrescriptionPDF(id, tenantId)` → Buffer |
| PDF | `lab-order-pdf.service.ts` | `generateLabOrderPDF(id, tenantId)` → Buffer |
| PDF | `report-pdf.service.ts` | `generateReportPDF(report, tenantId)` → Buffer |
| Almacenamiento | FS local (`UPLOAD_DIR`/`uploads`) | Archivos por tenant (`<UPLOAD_ROOT>/<tenant_id>/<random>.<ext>`) |

## 3. Superficie HTTP (`/api/attachments`, `app.ts:287`)

| Método | Ruta | Auth/rol | Notas |
|---|---|---|---|
| POST | `/api/attachments` | `doctor,admin,superadmin,patient,user` | `uploadAttachmentSchema`; body base64 + `mime_type`; valida ownership de la entidad |
| GET | `/api/attachments?entity_type&entity_id` | igual | Lista adjuntos de la entidad (valida ownership) |
| GET | `/api/attachments/:id/download` | igual | Stream con `Content-Disposition: inline`; valida ownership de la entidad fuente |
| DELETE | `/api/attachments/:id` | igual | Valida ownership; doctor/admin/superadmin o el propio `uploaded_by` |

### Endpoints PDF (en módulos dueños)

| Método | Ruta | Rol | Ownership |
|---|---|---|---|
| GET | `/api/clinical-records/prescriptions/:id/pdf` | doctor,user,patient | sí (doctor↔prescription, patient↔prescription) — `clinical-record.controller.ts:265-278` |
| GET | `/api/laboratory/:id/pdf` | admin,superadmin,doctor,lab_technician,user,patient | sí (patient/doctor) — `laboratory.controller.ts:131-139` |
| GET | `/api/reports/:id/pdf` | admin,superadmin | tenant-scoped vía `req.tenant_id` (`router.use(authorize('admin','superadmin'))`) — `report.routes.ts:16-17`, `report.controller.ts:32-44` |

## 4. Roles/ownership

- `assertOwnership` (`attachments.service.ts:76-102`): **admin/superadmin** acceso total en el tenant; **doctor** sólo si es el `doctor_id` de la entidad; **patient/user** sólo si es el `patient_id`. Otros roles → `ForbiddenError`.
- Idempotente con IDOR: se resuelve `getEntityOwnership(entity_type, entity_id, tenant_id)` antes de subir/listar/descargar/borrar.

## 5. Almacenamiento y validación

- **Ruta:** `UPLOAD_ROOT = UPLOAD_DIR || <cwd>/uploads`; subdirectorio por `tenant_id`; nombre `crypto.randomBytes(16).hex + ext` (máx 12 chars).
- **Límite:** `MAX_FILE_BYTES = 10 MB`; MIME permitido vía `ALLOWED_MIME` (imágenes, PDF, Word, Excel, texto, DICOM).
- **Transporte:** el archivo viaja en **base64 dentro del JSON** (`data_base64`), sujeto al límite global `express.json({ limit: '100kb' })` (`app.ts:182`).

## 6. Findings de SUB-9 (ver `05-findings.md`, FND-K1…K5)

**FND-K1 🟡** (el límite real de subida es ~75 KB por el `express.json` 100 KB, no 10 MB), **FND-K2 🟡** (sin validación de contenido/magic-bytes; `Buffer.from(base64)` nunca lanza → try/catch muerto), **FND-K3 🟡** (almacenamiento en FS efímero local → archivos perdidos en redeploy/multi-instancia).

## 7. NO VERIFICADO

- Si `UPLOAD_DIR` apunta a un volumen persistente en producción (Render) — si no, FND-K3 es pérdida de datos.
- Si los PDF de recetas/órdenes se archivan además como adjunto (no encontrado).
- Cobertura de tests de `attachments` y de los servicios PDF.
