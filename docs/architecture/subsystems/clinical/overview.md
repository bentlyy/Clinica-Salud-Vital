# SUB-7 — Historia clínica, fichas y recetas (PHI)

> **Estado:** descripción AS-IS completada · **Certeza global:** confirmado (lectura de código).
> **Evidencia principal:** `src/modules/clinical-record/*`, `src/modules/medical-history/*`, `src/modules/clinical-templates/*`, `src/shared/ownership.ts`, `src/shared/sanitize.ts`, montaje en `src/app.ts:272-283`.
> **PHI = Protected Health Information** (datos de salud identificables).

## 1. Propósito

Gestionar la **ficha clínica** (clinical record), sus **recetas** (prescriptions), los **antecedentes médicos** (medical history), las **plantillas clínicas** (clinical templates) y el **catálogo CIE-10** de diagnósticos. Es el subsistema de mayor sensibilidad: contiene PHI y por ello concentra las reglas de autorización por relación (BOLA) y la sanitización de entrada.

## 2. Componentes (3 módulos backend)

| Módulo | Responsabilidad | Persistencia |
|---|---|---|
| `clinical-record` | Fichas clínicas + recetas + catálogo CIE-10 + PDF de receta | `clinical_records`, `prescriptions`, `cie10_catalog` |
| `medical-history` | Antecedentes/condiciones por paciente | `medical_history` |
| `clinical-templates` | Plantillas de ficha reutilizables por tenant | `clinical_templates` |

## 3. Superficie HTTP (montaje `src/app.ts:272-283`)

| Base | Limiter | Notas |
|---|---|---|
| `/api/clinical-records` | `phiWriteLimiter` | 16 endpoints (fichas, recetas, CIE-10, PDF) |
| `/api/clinical-templates` | — | CRUD plantillas (doctor/admin) |
| `/api/medical-history` | — | CRUD antecedentes |

Todos los routers aplican `authMiddleware` global (`router.use(authMiddleware)`).

### 3.1 clinical-records — roles

- **Lectura de fichas**: `doctor`, `admin`, `user`, `patient` (`GET /`, `/:id`, `/:id/lab-results`, `/patient/:patient_id`).
- **Escritura de fichas**: solo `doctor` (`POST`, `PUT`, `DELETE`).
- **CIE-10**: `doctor`, `admin`.
- **Recetas**: `prescriptions/all` (doctor/admin/superadmin), `prescriptions/mine` (user/patient), `prescriptions/:id/pdf` (doctor/user/patient); crear/editar/eliminar: `doctor`.

### 3.2 medical-history — roles

- Lectura: `doctor`, `admin`, `user`, `patient`, `superadmin`.
- Escritura (`POST`/`PATCH`/`DELETE`): `doctor`, `admin`, `superadmin`.

### 3.3 clinical-templates — roles

- Todo: `doctor`, `admin`.

## 4. Autorización (dos modelos distintos dentro del mismo subsistema)

### 4.1 Modelo "por relación" (fail-closed) — `medical-history` y lecturas de `clinical-record`
- `medical-history.controller.ts` llama `assertDoctorPatientRelationship` (de `ownership.ts`) antes de leer/escribir por paciente.
- `clinical-record.controller.ts` (lecturas) implementa su **propio** chequeo inline: un doctor accede si **autoría de alguna ficha** (`records.some(r => r.doctor_id === doctor.id)`) **o** existe **booking** (`doesDoctorHaveBookingWithPatient`) (`clinical-record.controller.ts:30-36,107-114`).
- Paciente (`user`/`patient`): solo puede leer sus propios datos (`req.user.id === patient_id` / `record.patient_id === req.user.id`).

### 4.2 Modelo "por autoría" — escritura de `clinical-record`
- `update`/`delete` de ficha exigen `record.doctor_id === doctor.id` (`clinical-record.service.ts:251-252,342`).
- Recetas: `create`/`update`/`delete` exigen que la ficha pertenezca al doctor (`prescription.service.ts:64,107,179`).

### 4.3 Hueco detectado
- **`createClinicalRecord` NO valida relación médico-paciente** (ver FND-C1): a diferencia de `medical-history`, acepta cualquier `patient_id` del tenant.

## 5. Integridad de datos

- **Sanitización PHI**: `sanitizeTextStrict` sobre `chief_complaint, anamnesis, physical_exam, diagnosis, treatment_plan, notes` (create y update) (`clinical-record.service.ts:7-20,168-175,276`).
- **Idempotencia de ficha por booking**: advisory lock `create_clinical_record:<bookingId>` + verificación de duplicado (`clinical-record.service.ts:144-156`).
- **Concurrencia optimista**: `UPDATE ... WHERE updated_at = $old` → `CLINICAL_RECORD_CONFLICT` (`clinical-record.service.ts:284-297`).
- **Inmutabilidad**: no se edita una ficha `completed`; el `DELETE` es soft-cancel y solo de `draft` (`clinical-record.service.ts:255-257,340-348`).
- **Recetas**: lock `create_prescription:<recordId>` + anti-duplicado por medicamento (`ILIKE`) (`prescription.service.ts:52-75`).
- **Laboratorio**: crear/actualizar ficha con `lab_test_ids` genera `lab_requests` + `lab_request_items` validando que los tests existan/activos en el tenant (puente con SUB-8) (`clinical-record.service.ts:199-227`).

## 6. Acceso a datos

- Lecturas por `readPool`; escrituras/transacciones por `pool` (RLS activo; `clinical_records`, `prescriptions`, `medical_history` están en la lista RLS de `db/security.sql:87-97`).
- `clinical_templates` y `cie10_catalog` **no** aparecen en la lista RLS de `security.sql` (verificar en Fase 7): `clinical_templates` filtra por `tenant_id` a nivel aplicación; `cie10_catalog` es catálogo global (en `GLOBAL_TABLES` del test RLS: `rls-isolation.test.js:28`).

## 7. Roles de los 3 actores

| Rol | Puede |
|---|---|
| `doctor` | Ver pacientes con relación; crear/editar/borrar sus fichas; recetar; usar CIE-10 y plantillas |
| `user`/`patient` | Ver sus propias fichas y recetas; descargar su PDF |
| `admin` | Ver todas las fichas/recetas/antecedentes del tenant; CIE-10 y plantillas |
| `superadmin` | Rutas con `authorize('superadmin')`; pero el contexto de tenant cae a `'default'` (FND-C2) |

## 8. Findings de SUB-7 (ver `05-findings.md`, FND-C1…C10)

Destacan: **FND-C1** (create sin relación, 🟡→🔴), **FND-C2** (superadmin limitado a `'default'`), **FND-C3** (booking cancelada aún da relación), **FND-C5** (PII `patient_rut`/`email` expuesta). El resto son de mantenibilidad/consistencia.

## 9. Notas de NO VERIFICADO

- Si `clinical_records`/`medical_history` tienen `FORCE ROW LEVEL SECURITY` efectivo en producción (depende de SUB-3).
- Auditoría PHI: el trigger `phi_audit` cubre `clinical_records`, `invoices`, `payments` (`security.sql:349-367`) pero **no** `prescriptions` ni `medical_history` (verificar si es intencional en Fase 12).
- Cobertura de pruebas de los chequeos de relación (Fase 11).
