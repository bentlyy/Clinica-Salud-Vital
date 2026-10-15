# SUB-7 — Módulos y capas

| ID | Unidad | Tipo | Archivo | Responsabilidad | LOC |
|---|---|---|---|---|---|
| SUB7-U1 | clinical-record.routes | Router | `src/modules/clinical-record/clinical-record.routes.ts` | 16 endpoints fichas/recetas/CIE-10/PDF | 56 |
| SUB7-U2 | clinical-record.controller | Controller | `src/modules/clinical-record/clinical-record.controller.ts` | Autorización por rol/relación, orquestación | 287 |
| SUB7-U3 | clinical-record.service | Service | `src/modules/clinical-record/clinical-record.service.ts` | Fichas: CRUD, sanitización, locks, lab bridge | 404 |
| SUB7-U4 | clinical-record.schema | Validación | `src/modules/clinical-record/clinical-record.schema.ts` | Zod: ficha, signos vitales, receta, ids | 51 |
| SUB7-U5 | prescription.service | Service | `src/modules/clinical-record/prescription.service.ts` | Recetas CRUD + listados | 185 |
| SUB7-U6 | prescription-pdf.service | PDF | `src/modules/clinical-record/prescription-pdf.service.ts` | Genera PDF de receta (pdfkit) | — |
| SUB7-U7 | cie10.service | Service | `src/modules/clinical-record/cie10.service.ts` | Busca catálogo CIE-10 | 51 |
| SUB7-U8 | medical-history.routes/controller/service | CRUD | `src/modules/medical-history/*` | Antecedentes por paciente (con relación) | 31/98/104 |
| SUB7-U9 | clinical-templates.\* | CRUD | `src/modules/clinical-templates/*` | Plantillas por tenant | 23/…/90 |

## Notas

- **SUB7-U2** concentra la autorización. Implementa 3 ramas por rol (patient/doctor/admin-superadmin) y chequeo de relación **inline** (no reutiliza `ownership.ts`).
- **SUB7-U3** es el único lugar con sanitización PHI (`sanitizeTextStrict`) dentro de SUB-7.
- **SUB7-U5** importa la lógica de recetas del `clinical_record` (dependencia intra-módulo).
- **SUB7-U8** sí reutiliza `ownership.ts` (a diferencia de SUB7-U2) → inconsistencia de enfoque.

## Patrón general

Route/Schema/Controller/Service consistente en `clinical-record` y `clinical-templates`. `medical-history` rompe el patrón: define sus schemas Zod **inline en el router** y no tiene `.schema.ts`.
