# SUB-13 — Diagramas

> Formato Mermaid (decisión D-1). Fuente: `src/modules/audit/*`, `src/jobs/audit-integrity.job.ts`, `src/shared/crypto.service.ts`, `db/security.sql`, `db/migrations/023_fix_audit_rls.sql`.

## D1. Escritores de `audit_logs`

```mermaid
flowchart LR
  U[UPDATE/DELETE users] --> TS[trigger security_audit]
  CR[INSERT/UPDATE/DELETE clinical_records] --> TP[trigger phi_audit]
  IV[invoices / payments] --> TP
  TS --> AL[(audit_logs)]
  TP --> AL
  LA["audit.service.logAction (NO INVOCADO — código muerto)"] -.->|no escribe| AL
  NOTE["hash/previous_hash siempre NULL (FND-M1); user_id NULL (FND-M2)"] -.-> AL
```

## D2. RLS y políticas de `audit_logs`

```mermaid
flowchart TD
  RLS["audit_logs: ENABLE + FORCE ROW LEVEL SECURITY"]
  RLS --> P1["tenant_isolation (USING/WITH CHECK: tenant_id = current_setting('app.tenant_id'))"]
  RLS --> P2["audit_write (INSERT permissivo: tenant_id = app.tenant_id OR 'system')  [mig 023]"]
  TRIG["Triggers SECURITY DEFINER (owner subject to RLS)"] --> P2
  READ["GET /api/audit (clinic_app)"] --> P1
```

## D3. Cadena HMAC: escritura vs verificación (desalineadas)

```mermaid
flowchart TD
  W["logAction computeAuditHash"] --> WC["canonical = [prevHash|action|resource_type|resource_id|old|new|ip|tenant|Date.now()]"]
  V["verifyAuditChain expectedHash"] --> VC["canonical = [previous_hash|action|tenant_id]"]
  WC -. mismas entradas? NO .-> VC
  TRIG["Triggers: hash=NULL"] --> V
  RES["Resultado: hash row (NULL) != expectedHash => brokenLinks++ por fila (FALSO POSITIVO / no detecta manipulación)"]
  VC --> RES
```

## D4. Superficie de lectura de auditoría

```mermaid
flowchart LR
  C["GET /api/audit (admin/superadmin)"] --> CT[audit.controller]
  CT --> SV[audit.service.getAuditLogs]
  SV --> DB[(audit_logs LEFT JOIN users)]
  SV --> OUT["res.json(rows) — array sin total (FND-M6)"]
  subgraph CRON
    CR["cron 6h"] --> VA[verifyAuditChain]
    VA --> DB
  end
```
