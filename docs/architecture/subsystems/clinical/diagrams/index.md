# SUB-7 — Diagramas (Mermaid)

> Herramienta `diagram-design` no disponible ⇒ Mermaid (decisión D-1).

## D1. Mapa de módulos y tablas

```mermaid
flowchart TB
  subgraph SUB7["SUB-7 Historia clínica (PHI)"]
    CR["clinical-record<br/>fichas + recetas + CIE-10"]
    MH["medical-history<br/>antecedentes"]
    CT["clinical-templates<br/>plantillas"]
  end
  CR --> T1[(clinical_records)]
  CR --> T2[(prescriptions)]
  CR --> T3[(cie10_catalog · global)]
  CR -->|escribe| LAB[(lab_requests / lab_request_items)]
  MH --> T4[(medical_history)]
  CT --> T5[(clinical_templates)]
  OW["shared/ownership.ts"] -.->|usa| MH
  CR -.->|NO usa ownership| OW
```

## D2. Autorización por rol y relación (lectura de ficha)

```mermaid
flowchart TD
  REQ[GET /clinical-records/:id] --> GET[service.getClinicalRecordById<br/>RLS + tenant]
  GET --> ROL{rol}
  ROL -->|doctor| D{record.doctor_id == doctor.id?}
  D -->|no| DENY403[403 ACCESS_DENIED]
  D -->|sí| OK[200 ficha + recetas + labs]
  ROL -->|user/patient| P{record.patient_id == user.id?}
  P -->|no| DENY403
  P -->|sí| OK
  ROL -->|admin| OK
  ROL -->|superadmin| DEF[tenant context = 'default'<br/>⚠ ve solo 'default']
```

## D3. Crear ficha — validaciones y hueco

```mermaid
flowchart TD
  POST[POST /clinical-records · doctor] --> DOC[getDoctorByUserId]
  DOC --> SVC[service.createClinicalRecord]
  SVC --> LOCK{booking_id?}
  LOCK -->|sí| ALC[advisory lock + anti-duplicado]
  LOCK -->|no| PAT
  ALC --> PAT[verifica paciente en tenant]
  PAT --> BOK{booking en tenant?}
  BOK --> SAN[sanitizeTextStrict 6 campos PHI]
  SAN --> INS[INSERT clinical_records]
  INS --> LABS{lab_test_ids?}
  LABS -->|sí| LABI[INSERT lab_requests + items]
  LABS -->|no| COMMIT
  LABI --> COMMIT[COMMIT]
  REL["assertDoctorPatientRelationship<br/>⚠ AUSENTE (FND-C1)"]:::hot
  classDef hot fill:#ffe0e0,stroke:#c00;
```

## D4. Ciclo de vida de la ficha

```mermaid
stateDiagram-v2
  [*] --> draft: POST (doctor)
  draft --> draft: PUT (sanitiza, optimistic lock)
  draft --> completed: PUT status=completed
  completed --> completed: 🔒 no editable (CLINICAL_RECORD_COMPLETED)
  draft --> cancelled: DELETE (soft-cancel, solo draft)
  note right of cancelled
    getAllClinicalRecords NO excluye cancelled (FND-C4)
    getClinicalRecordsByPatient SÍ excluye cancelled
  end note
```
