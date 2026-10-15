# SUB-9 — Dependencias

## Aristas internas (backend)

| Origen | → Destino | Tipo | Evidencia |
|---|---|---|---|
| `attachments.routes` | `auth.middleware`, `validate.middleware` | import | `:2-3` |
| `attachments.routes` | `attachments.controller` | import | `:4` |
| `attachments.routes` | `attachments.schema` | import | `:5` |
| `attachments.controller` | `attachments.service` | call | `:2,16,30,43,58` |
| `attachments.controller` | `doctor.service.getDoctorByUserId` | call | `:6,10` |
| `attachments.controller` | `fs` (`createReadStream`,`existsSync`) | IO | `:4,50,53` |
| `attachments.service` | `shared/db.pool` | query | `:1,24,31,41,50,57,65,198,221,235,257,272` |
| `attachments.service` | `fs` (`mkdir`,`writeFile`,`unlink`) | IO | `:2,192,196,274` |
| `attachments.service` | `crypto.randomBytes` | nombre almacenado | `:4,195` |
| `clinical-record.controller` | `prescription-pdf.service` | call | `:9,280` |
| `laboratory.controller` | `lab-order-pdf.service` (dynamic import) | call | `:141-142` |
| `report.controller` | `report-pdf.service` (dynamic import) | call | `:37-38` |

## Aristas montaje

| Origen | → Destino | Evidencia |
|---|---|---|
| `app.ts` | `attachments.routes` | `app.use(\`${API_PREFIX}/attachments\`, attachmentsRoutes)` `app.ts:287` |

## Depende de

- **SUB-7 (clinical)**: entidades `clinical_records`, `prescriptions`, y el endpoint PDF de receta.
- **SUB-8 (lab)**: entidad `lab_requests` (`entity_type='lab_result'`) y PDF de orden.
- **SUB-12 (reports)**: `report-pdf.service`.
- **SUB-6 (booking)**: entidad `booking`.
- **SUB-5 (users)**: `doctor.service.getDoctorByUserId`, entidad `patient` (`users.id`).
- **SUB-3/15**: `req.tenant_id`, RLS, tabla `attachments`.
- **SUB-4**: auth/roles.

## Es dependido por

- **Frontend attachments** (`AttachmentsList` en fichas de clinical/lab).
- **SUB-14 (data-portability)**: exporta filas de `attachments` (`data-portability.service.ts:103,121`).

## Acoplamientos detectados

- **Límite efectivo de subida** determinado por el parser JSON global (100 KB), no por `MAX_FILE_BYTES` (FND-K1).
- **FS local** compartida por attachments y onboarding; sin capa de almacenamiento (FND-K3).
- **Sin validación de contenido** (magic bytes) → confianza en `mime_type` del cliente (FND-K2).
- **Sin FK física** `attachments(entity_id)` → posible adjunto huérfano si se borra la entidad.
