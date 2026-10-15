# SUB-17 — Diagramas

> Formato Mermaid (decisión D-1). Fuente: `src/modules/specialties/*`, `src/modules/currencies/*`, `src/shared/currencies.ts`, `db/init.sql`.

## D1. Módulos, rutas y tablas

```mermaid
flowchart LR
  SPEC["/api/specialties"] --> SC[specialties.controller] --> SS[specialties.service]
  SS --> TSP[(specialties)]
  SS --> TDOC[(doctors)]
  CUR["/api/currencies/rates"] --> CC[currencies.controller] --> CU[shared/currencies]
  DOCTOR[doctor.service] --> SS
  BILLING[billing super-admin] --> CU
```

## D2. Resolución de tenant en rutas públicas (riesgo O1)

```mermaid
flowchart TD
  REQ["GET /api/specialties (sin auth)"] --> TM[tenantMiddleware]
  TM --> R["tenant = req.user.tenant_id || header['x-tenant-id'] || DEFAULT"]
  R --> Q["getAllSpecialties(tenant)"]
  Q --> OUT["devuelve specialties + doctors[name,email] del tenant elegido"]
  HDR["Atacante fija X-Tenant-Id arbitrario (PUBLIC_PATH)"] --> R
  OUT --> LEAK["enumeración cross-tenant de emails de doctores (FND-O1)"]
```

## D3. Ciclo de la especialidad

```mermaid
stateDiagram-v2
  [*] --> Ausente
  Ausente --> Creada: POST (admin/superadmin) / ensureSpecialty (alta doctor)
  Creada --> Existente: POST duplicado (get-or-create, no 409)
  Creada --> Editada: PUT/:id
  Editada --> Eliminada: DELETE/:id
  Existente --> Editada
```

## D4. Tasas de cambio

```mermaid
flowchart LR
  BOOT["boot / cron 6h (app.ts:512)"] --> RR[refreshRates]
  RR --> EXT["fetch open.er-api.com/v6/latest/USD (8s)"]
  EXT -->|ok| CACHE["cachedRates = pickSupported(rates)"]
  EXT -->|fallo| FB["mantiene FALLBACK_RATES (USD1 CLP950 ARS1200 BRL5.4 MXN18.5)"]
  GET["GET /api/currencies/rates"] --> CACHE
  GET --> FB
```
