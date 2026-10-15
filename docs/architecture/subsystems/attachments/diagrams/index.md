# SUB-9 — Diagramas

> Contexto: `[[../../01-system-context]]` · Clinical: `[[../clinical/overview]]` · Laboratorio: `[[../laboratory/overview]]`

## D1. Módulos, entidades y almacenamiento

```mermaid
flowchart TD
  R[attachments.routes] --> C[attachments.controller] --> S[attachments.service]
  S --> DB[(attachments)]
  S --> FS[(UPLOAD_DIR/&lt;tenant&gt;/)]
  C --> DOC[doctor.service.getDoctorByUserId]
  S -.ownership.-> E{clinical_record|prescription|lab_result|booking|medical_history|patient}
  subgraph PDF
    CP[prescription-pdf] --> PK[pdfkit]
    LO[lab-order-pdf] --> PK
    RP[report-pdf] --> PK
  end
```

## D2. Verificación de ownership (anti-IDOR)

```mermaid
flowchart TD
  A[assertOwnership] --> AD{role}
  AD -->|admin/superadmin| OK1[permitir]
  AD -->|doctor| D1{ownership.doctorId == doctorId?}
  D1 -->|sí| OK2[permitir]
  D1 -->|no| F1[Forbidden]
  AD -->|patient/user| P1{ownership.patientId == userId?}
  P1 -->|sí| OK3[permitir]
  P1 -->|no| F2[Forbidden]
  AD -->|otro| F3[Forbidden]
```

## D3. Ciclo de vida de un adjunto

```mermaid
flowchart LR
  U[upload base64] --> V[validar mime/tamaño]
  V --> O[ownership]
  O --> W[write FS + INSERT]
  W --> L[listar]
  L --> D[descargar stream]
  D --> DEL[delete row + unlink]
```

## D4. Rutas PDF y su control de acceso

```mermaid
flowchart TD
  P1[GET prescriptions/:id/pdf] --> O1[doctor/patient ownership]
  P2[GET laboratory/:id/pdf] --> O2[doctor/patient ownership]
  P3[GET reports/:id/pdf] --> O3[authorize admin/superadmin]
```
