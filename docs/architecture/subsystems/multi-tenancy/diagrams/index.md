# SUB-3 — Diagramas (Mermaid)

> El MCP `diagram-design` no está disponible; se usa Mermaid (decisión D-1).

## D1. Aislamiento por request (capas)

```mermaid
flowchart TD
  C[Cliente] -->|JWT / X-Tenant-Id| OA[optionalAuth]
  OA -->|req.user| TM[tenantMiddleware]
  TM -->|tenantService.getById| TC[(Cache tenants<br/>TTL 5min)]
  TC -.->|miss| DBt[(tabla tenants)]
  TM -->|req.tenant_id| AM[authMiddleware roles]
  TM -->|tenantContext.run| ALS[AsyncLocalStorage]
  AM --> R[Ruta / Controller]
  R --> S[Service]
  ALS -.->|tenant_id por query| W[pool envuelto]
  S --> W
  W -->|set_config app.tenant_id| PG[(PostgreSQL + RLS)]
  SA[superAdminPool BYPASSRLS] --> PG
```

## D2. Decisión de aislamiento (RLS vs fallback)

```mermaid
flowchart TD
  Q[Query] --> CTX{¿Hay contexto<br/>de tenant?}
  CTX -->|sí, request| SET[set_config app.tenant_id = tenant]
  CTX -->|no, job/webhook| DEF[app.tenant_id = DEFAULT_TENANT_ID 'default']
  SET --> POL{Policy tenant_isolation}
  DEF --> POL
  POL -->|tenant_id = GUC| OK[Filas del tenant]
  POL -->|sin GUC| FB["COALESCE(..., 'default')<br/>⚠ fail-open a 'default'"]
  SUPER[superAdminPool BYPASSRLS] --> ALL[Todas las filas]
```

## D3. Modelo de pools y wrappers

```mermaid
flowchart LR
  subgraph App[Proceso Node]
    P[pool<br/>clinic_app · RLS]
    R[readPool<br/>DATABASE_URL_READ_ONLY]
    S[superAdminPool<br/>BYPASSRLS]
    TAG[tagTenantAwarePool]
  end
  TAG --> P
  TAG -.->|si hay READ_ONLY| R
  S -.->|sin wrapper| S
  P --> DB[(PostgreSQL)]
  R --> DB
  S --> DB
```

## D4. Tablas con RLS y excepciones

```mermaid
flowchart TD
  SEC[security.sql] --> T37[37 tablas con tenant_id<br/>policy tenant_isolation]
  SEC --> SAAS[5 tablas SaaS<br/>plans, subscriptions,<br/>subscription_invoices,<br/>tenant_features, tenant_usage]
  T37 --> U[users: bypass superadmin<br/>tenant_id IS NULL]
  T37 --> D[doctors: sin bypass]
  T37 --> A[audit_logs: INSERT 'system']
  T37 --> TN[tenants: USING true / CHECK false]
  SAAS --> W021["migración 021: restrict_writes<br/>USING (tenant_id GUC IS NOT NULL)<br/>⚠ debilita escritura"]
  LEAK[KNOWN_LEAKING · rls-isolation.test.js]:::hot
  classDef hot fill:#ffe0e0,stroke:#c00;
```
