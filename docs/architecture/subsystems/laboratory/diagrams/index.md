# SUB-8 — Diagramas (Mermaid)

> Herramienta `diagram-design` no disponible ⇒ Mermaid (decisión D-1).

## D1. Mapa de módulos, tablas y consumidores

```mermaid
flowchart TB
  subgraph SUB8["SUB-8 Laboratorio (/api/laboratory)"]
    RT["laboratory.routes<br/>46 endpoints + requireFeature"]
    CT["laboratory.controller<br/>ownership + SSE"]
    SV["laboratory.service<br/>dominio (1022 L)"]
    EM["lab-result-email.service<br/>email + token público"]
    PD["lab-order-pdf.service<br/>pdfkit"]
    EV["lab-events.service<br/>EventEmitter por tenant"]
  end
  RT --> CT --> SV
  CT --> EM
  CT --> PD
  CT --> EV
  SV --> NT["notifications.service"]
  SV --> DB[("pool / readPool (RLS)")]
  EM --> Q["queue.service email:send"]
  subgraph TABLES["tablas lab_* (RLS)"]
    T1[(lab_areas)]
    T2[(lab_tests)]
    T3[(lab_requests)]
    T4[(lab_request_items)]
    T5[(lab_samples)]
    T6[(lab_qc_records)]
    T7[(lab_equipment)]
    T8[(lab_reagents)]
    T9[(lab_notifications)]
    T10[(lab_result_history · MUERTA)]
  end
  SV --> TABLES
  CR["SUB-7 clinical-record"] -->|crea orden| T3
  CR --> T4
```

## D2. Ciclo de vida de la orden/ítem (máquina de estados implícita)

```mermaid
stateDiagram-v2
  [*] --> pending: POST /laboratory
  pending --> received: muestras/estado manual
  received --> verified --> assigned --> processing
  processing --> qc_review
  qc_review --> result_entered
  processing --> validated_tech
  result_entered --> validated_tech
  validated_tech --> validated_doctor
  validated_doctor --> signed
  signed --> delivered
  pending --> cancelled: DELETE /:id
  pending --> rejected
  note right of result_entered
    PATCH /items/:id/result NO escribe 'result_entered' (FND-E2)
    → 'validated_tech' suele alcanzarse solo si el estado
      se fijó a mano (updateLabRequestItemStatus)
  end note
  note right of validated_tech
    updateLabRequestStatus / ItemStatus acepta CUALQUIER estado
    del CHECK sin validar transición (FND-E3)
  end note
```

## D3. Captura → validación → firma → entrega

```mermaid
sequenceDiagram
  participant D as Doctor
  participant T as Lab technician
  participant API as laboratory.service
  participant DB as PostgreSQL
  participant N as Notificaciones
  D->>API: PATCH /items/:id/result
  API->>DB: UPDATE result_value (status NO cambia) ⚠
  T->>API: PATCH /items/:id/validate-tech
  API->>DB: status IN (result_entered|processing)? → validated_tech
  D->>API: PATCH /items/:id/validate-doctor
  API->>DB: validated_tech → validated_doctor
  D->>API: PATCH /items/:id/sign
  API->>DB: validated_doctor → signed
  T->>API: PATCH /items/:id/deliver
  API->>DB: BEGIN → delivered; si no quedan ítems → orden delivered+completed_at → COMMIT
  API->>N: createNotification(paciente 'Resultados publicados')
```

## D4. Entrega pública de resultados (email + token)

```mermaid
flowchart TD
  A["POST /results/email (staff)"] --> B["email = body.email ?? patient_email"]
  B --> C["getLabResultsByRequest(id, tenant) · PHI"]
  C --> D["token = signInvite(scope=lab-result, 7d)"]
  D --> E["enqueueJob(email:send, to=email, tenantId)"]
  E --> F["Email con link /lab-results?token=…"]
  F --> G["GET /results/shared/:token  (PÚBLICO)"]
  G --> H["verify(token) → scope/labRequestId/tenantId"]
  H --> I["getLabResultsByRequest(id, tenant del token)"]
  note1["⚠ to arbitrario, sin ownership (FND-E1)"]
  note2["⚠ sin rate limit · token 7d reutilizable (FND-E5)"]
  A -.-> note1
  G -.-> note2
```
