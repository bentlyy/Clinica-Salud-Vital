# SUB-7 — Inventario de archivos

## Módulo `clinical-record`

| Archivo | LOC | Rol | Estado |
|---|---|---|---|
| `clinical-record.routes.ts` | 56 | Router | leído |
| `clinical-record.controller.ts` | 287 | Controller | leído |
| `clinical-record.service.ts` | 404 | Service | leído |
| `clinical-record.schema.ts` | 51 | Zod | leído |
| `prescription.service.ts` | 185 | Service | leído |
| `prescription-pdf.service.ts` | — | PDF | referenciado |
| `cie10.service.ts` | 51 | Service | leído |

## Módulo `medical-history`

| Archivo | LOC | Estado |
|---|---|---|
| `medical-history.routes.ts` | 31 | leído |
| `medical-history.controller.ts` | 98 | leído |
| `medical-history.service.ts` | 104 | leído |

## Módulo `clinical-templates`

| Archivo | LOC | Estado |
|---|---|---|
| `clinical-template.routes.ts` | 23 | leído |
| `clinical-template.service.ts` | 90 | leído |
| `clinical-template.controller.ts` | — | pendiente |
| `clinical-template.schema.ts` | — | pendiente |

## Dependencias transversales

| Archivo | Uso |
|---|---|
| `src/middlewares/auth.middleware.ts` | `authMiddleware`, `authorize` |
| `src/middlewares/validate.middleware.ts` | `validateZod` |
| `src/shared/ownership.ts` | `assertDoctorPatientRelationship`, `assertPatientInTenant` (solo medical-history) |
| `src/shared/sanitize.ts` | `sanitizeTextStrict` (solo clinical-record.service) |
| `src/shared/db.ts` | `pool` / `readPool` |
| `src/modules/doctor/doctor.service.ts` | `getDoctorByUserId` |
| `src/utils/error-codes.ts` | `E.CLINICAL_RECORD_*`, `E.PRESCRIPTION_*`, `E.TEMPLATE_*`, `E.MEDICAL_HISTORY_*`, `E.CIE10_*` |

## Tablas de base de datos

| Tabla | RLS | Módulo dueño |
|---|---|---|
| `clinical_records` | sí (`security.sql:88`) | clinical-record |
| `prescriptions` | sí (`security.sql:88`) | clinical-record |
| `medical_history` | sí (`security.sql:94`) | medical-history |
| `clinical_templates` | **no listada** en RLS `security.sql` | clinical-templates |
| `cie10_catalog` | global (no multi-tenant) | clinical-record |
| `lab_requests`, `lab_request_items` | sí | SUB-8 (escritas desde clinical-record) |
