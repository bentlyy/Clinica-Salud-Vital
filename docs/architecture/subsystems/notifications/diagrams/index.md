# SUB-10 — Diagramas

> Contexto: `[[../../01-system-context]]` · Booking: `[[../booking/overview]]` · Auditoría: `[[../audit/overview]]`

## D1. Módulos, jobs y tablas

```mermaid
flowchart TD
  subgraph HTTP
    NR[notification.routes] --> NC[notification.controller] --> NS[notification.service]
  end
  subgraph JOBS
    RJ[reminder.job cron */5] --> EM[email.service]
    AI[audit-integrity.job cron 6h]
  end
  NS --> NT[(notifications)]
  RJ --> BK[(bookings)]
  RJ --> US[(users)]
  AI --> AL[(audit_logs)]
  APP[app.ts] --> NR
  APP --> RJ
  APP -.import.-> AI
```

## D2. Scope de notificaciones (usuario vs superadmin)

```mermaid
flowchart TD
  REQ[GET /api/notifications] --> R{role==superadmin?}
  R -->|sí| SA[allUsers=true + tenantFilter=query.tenant_id]
  R -->|no| U[allUsers=false, user_id=req.user.id]
  SA --> L[listNotifications]
  U --> L
  L --> R1[markAllAsRead ignora allUsers FND-I?]
```

## D3. Ciclo del recordatorio

```mermaid
flowchart TD
  CRON[cron cada 5 min] --> Q[SELECT bookings pending en ventana]
  Q --> LOOP{por booking}
  LOOP --> SEND[sendWithRetry x3]
  SEND -->|ok| MARK[UPDATE sentField=TRUE]
  SEND -->|fail| LOG[logger.error, no marca]
  MARK --> NEXT[siguiente]
  LOG --> NEXT
```

## D4. Cascada de recordatorios en el tiempo

```mermaid
sequenceDiagram
  participant C as Cron
  participant B as bookings
  participant E as Email
  Note over C: t-24h (23-25h) -> reminder_24h_sent
  C->>B: SELECT pending en ventana 24h
  B-->>C: filas
  C->>E: recordatorio "mañana"
  E-->>C: sent
  C->>B: UPDATE reminder_24h_sent=TRUE
  Note over C: t-1h (55-65m) -> reminder_1h_sent
  C->>B: SELECT pending en ventana 1h
  B-->>C: filas
  C->>E: recordatorio "en 1 hora" (+confirmar)
  E-->>C: sent
  C->>B: UPDATE reminder_1h_sent=TRUE
```
