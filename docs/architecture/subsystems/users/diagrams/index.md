# SUB-5 — Diagramas

Índice de diagramas (Mermaid) del subsistema Usuarios, doctores y pacientes.

> Vista de datos: `[[../database/overview]]` · Auth: `[[../auth/overview]]` · Multi-tenancy: `[[../multi-tenancy/overview]]` · Contexto: `[[../../01-system-context]]`

## D1. Módulos y tablas

```mermaid
flowchart TD
  subgraph HTTP
    DR[doctor.routes/controller] --> DS[doctor.service]
    AR[auth.routes/controller] --> AS[auth.service]
    SAR[super-admin.routes/controller] --> SAS[super-admin.service]
  end
  DS --> USERS[(users)]
  DS --> DOC[(doctors / doctor_availability)]
  DS --> MAIL[shared/email.service]
  DS --> JWT[shared/jwt.service]
  AS --> USERS
  AS --> DOC
  SAS --> USERS
  AS -.verifyInviteToken.-> DS
```

## D2. Rutas del frontend vs endpoints reales

```mermaid
flowchart LR
  subgraph OK [endpoints existentes]
    A1[GET /doctors] --> A1b[OK]
    A2[GET /doctors/public] --> A2b[OK]
    A3[POST /doctors/register] --> A3b[OK]
    A4[POST /doctors/invite] --> A4b[OK]
    A5[GET /doctors/users] --> A5b[OK]
    A6[PATCH /doctors/users/:id/active] --> A6b[OK]
    A7[POST /auth/register · /auth/invite-info] --> A7b[OK]
  end
  subgraph BROKEN [consumidos por frontend inexistentes]
    B1[GET /doctors/:id] --> B1b[404 FND-I3]
    B2[GET /doctors/:id/stats] --> B2b[404 FND-I3]
    B3[GET /doctors/:id/schedule] --> B3b[404 FND-I3]
    B4[POST /doctors/:id/invite] --> B4b[404 FND-I2]
  end
```

## D3. Alta de doctor e invitación (dos caminos)

```mermaid
flowchart TD
  ADMIN[admin] -->|POST /doctors/register| RD[registerDoctor]
  RD --> TP[tempPassword no entregada]
  RD --> LINK[email /setup-password]
  LINK --> DEAD[sin endpoint consumidor FND-I1]
  ADMIN -->|POST /doctors/invite| INV[invitePerson]
  INV --> MAILT[email /register?invite=token]
  MAILT --> REG[POST /auth/register + invite_token]
  REG --> OK{role}
  OK -->|doctor| DOC[users+doctors]
  OK -->|patient| PAT[users patient]
  OK -->|lab_technician| LTS[users lab_technician]
```

## D4. Identidad y roles

```mermaid
flowchart TD
  U[users.id] -->|role=superadmin| SA[SuperAdmin global]
  U -->|role=admin| AD[admin tenant]
  U -->|role=doctor| DD[doctors.user_id 1:1]
  U -->|role=lab_technician| LT[lab]
  U -->|role=patient / user| PT[pacientes -> patient_id]
  DD --> AV[doctor_availability]
```

## D5. Gestión de usuarios: dos módulos

```mermaid
flowchart LR
  DOCADMIN[admin/doctor] -->|GET /doctors/users| DTENANT[tenant-scoped]
  DOCADMIN -->|PATCH /doctors/users/:id/active| DTENANT
  SUPER[superadmin] -->|GET /super-admin/users| SGLOBAL[global BYPASSRLS]
  SUPER -->|PATCH /super-admin/users/:id/active| SSCOPE[acotado a req.tenant_id FND-I9]
```
