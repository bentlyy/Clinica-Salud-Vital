# SUB-15 — Diagramas

Índice de diagramas (Mermaid) del subsistema Base de datos / acceso a datos.

> Vista multi-tenant: `[[../multi-tenancy/overview]]` · Contexto: `[[../../01-system-context]]`

## D1. Pools, contexto y RLS

```mermaid
flowchart TD
  REQ[Request HTTP] --> TM[tenant.middleware<br/>tenantContext.run tenantId]
  TM --> SVC[service: pool.query]
  SVC --> W[tagTenantAwarePool.scopedQuery]
  W --> C1[rawConnect]
  C1 --> SET[set_config app.tenant_id = ctx]
  SET --> Q[query -- RLS]
  Q --> RST[set_config app.tenant_id = default]
  RST --> REL[client.release]

  subgraph Pools
    P1[pool - clinic_app RLS<br/>max 15]
    P2[readPool - READ_ONLY<br/>fallback->pool]
    P3[superAdminPool - BYPASSRLS<br/>fallback->pool]
  end
  W -.usa.-> P1
```

## D2. Familias de tablas y relaciones clave

```mermaid
erDiagram
  tenants ||--o{ users : tenant_id
  users ||--o{ doctors : user_id
  doctors ||--o{ bookings : doctor_id
  users ||--o{ bookings : user_id
  bookings ||--o{ booking_status_history : booking_id
  users ||--o{ clinical_records : patient_id
  doctors ||--o{ clinical_records : doctor_id
  clinical_records ||--o{ prescriptions : clinical_record_id
  users ||--o{ lab_requests : patient_id
  doctors ||--o{ lab_requests : doctor_id
  lab_requests ||--o{ lab_request_items : lab_request_id
  lab_tests ||--o{ lab_request_items : lab_test_id
  invoices ||--o{ invoice_items : invoice_id
  invoices ||--o{ payments : invoice_id
  tenants ||--o{ subscriptions : tenant_id
  plans ||--o{ subscriptions : plan_id
  tenants ||--o{ tenant_onboarding : tenant_id
```

## D3. Bootstrap de esquema

```mermaid
flowchart LR
  A[init.sql<br/>49 tablas + índices + triggers + seeds] --> B[security.sql<br/>roles + RLS + auditoría]
  B --> C[migrations 001-031]
  C --> D[_migrations]
  C --> E[optimize.sql<br/>VACUUM/EXPLAIN manual]
```

## D4. Drift de esquema (init.sql vs migraciones)

```mermaid
flowchart TD
  INIT[init.sql CREATE TABLE IF NOT EXISTS] --> T1[clinical_templates]
  INIT --> T2[tenant_onboarding / onboarding_documents]
  INIT --> T3[lab_* / lab_result_history]
  MIG[migrations 003-005,026] --> T1
  MIG --> T2
  MIG --> T3
  T1 --> DRIFT[Doble definición -> riesgo de divergencia FND-G1]
  T2 --> DRIFT
  T3 --> DRIFT
```
