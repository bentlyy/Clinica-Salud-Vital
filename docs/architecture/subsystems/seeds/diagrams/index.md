# SUB-18 — Diagramas

> Formato Mermaid (decisión D-1). Fuente: `src/seed/*`, `src/app.ts`.

## D1. Orquestación de arranque

```mermaid
flowchart TD
  BOOT[app.ts post-boot] --> RW[registerWorkers + startQueueProcessor + loadFromDB]
  RW --> GATE{"NODE_ENV!=='production' || RUN_SEEDS==='true'?"}
  GATE -->|no| SKIP[markSeedComplete + log seeds deshabilitados]
  GATE -->|sí| SD[seedDefaultTenant] --> SS[seedSuperAdmin] --> ST[seedTestTenants] --> S["seed()"]
  S --> BF[backfills x5] --> SP[spreadSeedDates] --> MC[markSeedComplete]
  MC --> CRON[reminder / rates 6h / verifyAuditChain 6h / cleanup 03:00]
```

## D2. Credenciales de seed

```mermaid
flowchart LR
  A["admin@clinic.com"] --> AP["ADMIN_PASSWORD (env)"]
  B[superadmin] --> SP["SUPERADMIN_PASSWORD (env)"]
  C["admin@demo.clinic.com"] --> DP["DemoVitaria2026! (hardcodeado)"]
  D["resto de usuarios"] --> DDP["deriveSeedPassword -> Vitaria.slug.año!"]
  DP --> RISK[FND-P1 riesgo si RUN_SEEDS/SEED_ON_STARTUP en prod]
  DDP --> RISK
```

## D3. Ciclo idempotente de seed()

```mermaid
stateDiagram-v2
  [*] --> DDL: CREATE INDEX / ADD COLUMN / DROP+ADD constraint
  DDL --> Check: gate SEED_ON_STARTUP
  Check --> Skip: deshabilitado
  Check --> Exists: admin@clinic.com existe
  Exists --> Doctors: ensureDoctorsExist() (idempotente)
  Check --> Full: first run
  Full --> Doctors
  Doctors --> [*]
```

## D4. DDL en runtime (efecto lateral)

```mermaid
sequenceDiagram
  participant App
  participant DB
  App->>DB: CREATE UNIQUE INDEX IF NOT EXISTS idx_users_tenant_email
  App->>DB: ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS token_version
  App->>DB: ALTER TABLE bookings DROP CONSTRAINT check_future_date
  App->>DB: ... INSERTs ...
  App->>DB: ALTER TABLE bookings ADD CONSTRAINT check_future_date ... NOT VALID
  Note over App,DB: constraint desactivada durante el seed (anti-patrón FND-P3)
```
