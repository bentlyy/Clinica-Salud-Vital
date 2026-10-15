# SUB-7 — Dependencias

## Aristas internas

| Origen | Destino | Qué | Evidencia |
|---|---|---|---|
| `clinical-record.routes` | `auth.middleware` | `authMiddleware`, `authorize` | `clinical-record.routes.ts:2` |
| `clinical-record.routes` | `clinical-record.controller` | 16 handlers | `clinical-record.routes.ts:11-29` |
| `clinical-record.routes` | `clinical-record.schema` | 5 schemas | `clinical-record.routes.ts:4-10` |
| `clinical-record.controller` | `clinical-record.service` | CRUD fichas | `clinical-record.controller.ts:2` |
| `clinical-record.controller` | `prescription.service` | recetas | `clinical-record.controller.ts:3` |
| `clinical-record.controller` | `cie10.service` | catálogo | `clinical-record.controller.ts:4` |
| `clinical-record.controller` | `doctor.service` | `getDoctorByUserId` | `clinical-record.controller.ts:5` |
| `clinical-record.controller` | `prescription-pdf.service` | `generatePrescriptionPDF` | `clinical-record.controller.ts:9` |
| `clinical-record.controller` | `shared/db` | `pool` (SQL inline en `getAllPrescriptions`) | `clinical-record.controller.ts:207` |
| `clinical-record.service` | `shared/db` | `pool`, `readPool` | `clinical-record.service.ts:1` |
| `clinical-record.service` | `shared/sanitize` | `sanitizeTextStrict` | `clinical-record.service.ts:4` |
| `prescription.service` | `shared/db` | `pool`, `readPool` | `prescription.service.ts:1` |
| `medical-history.controller` | `ownership` | `assertDoctorPatientRelationship`, `assertPatientInTenant` | `medical-history.controller.ts:6` |
| `medical-history.controller` | `doctor.service` | `getDoctorByUserId` | `medical-history.controller.ts:5` |
| `medical-history.routes` | `zod` (inline) | schemas en el router | `medical-history.routes.ts:5,9-22` |
| `clinical-template.controller` | `clinical-template.service` | CRUD | — |

## Depende de (otros subsistemas)

- **SUB-2/SUB-3**: `authMiddleware`, `authorize`, RLS/tenant.
- **SUB-5** (`doctor`): `getDoctorByUserId`.
- **SUB-8** (laboratorio): escribe `lab_requests`/`lab_request_items`.
- **SUB-9** (PDF): `prescription-pdf.service`.
- **SUB-13** (auditoría): trigger `phi_audit` en `clinical_records`.

## Es dependido por

- Frontend `clinical-records`, `clinical-templates`, `medical-history`, `clinical` (SUB-1).
- **SUB-12** (reports/analytics) puede leer `clinical_records`.
- **SUB-14** (data-portability) exporta PHI.

## Riesgos de acoplamiento

- `clinical-record.service` **escribe en tablas de laboratorio** (acoplamiento entre SUB-7 y SUB-8): cambios en el esquema de lab impactan a la ficha.
- El chequeo de relación está **duplicado** (inline en `clinical-record`, en `ownership.ts` para `medical-history`) → riesgo de divergencia (ver FND-C1/C3).

## Dependencias circulares

Ninguna detectada.
