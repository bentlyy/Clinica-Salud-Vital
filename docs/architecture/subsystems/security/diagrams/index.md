# SUB-4 — Diagramas

Índice de diagramas (Mermaid) del subsistema de Seguridad transversal.

> Vista general: `[[../../01-system-context]]` · Detalle multi-tenant: `[[../multi-tenancy/overview]]` · Auth: `[[../auth/overview]]`

## D1. Cadena de seguridad por petición

```mermaid
flowchart TD
  A[Petición] --> B[securityMiddleware<br/>helmet + CSP + hpp]
  B --> C[compression]
  C --> D[CORS allowlist]
  D --> E[cookieParser COOKIE_SECRET]
  E --> F[express.json 100kb]
  F --> G[csrfProtection<br/>double-submit cookie]
  G --> H[optionalAuth<br/>firma JWT sin sesión]
  H --> I[tenantMiddleware]
  I --> J[trackActivity]
  J --> K[globalLimiter 500/15min]
  K --> L{Ruta}
  L -->|auth credenciales| M[authLimiter 10/15min]
  L -->|refresh/logout| N[sessionLimiter 60/15min]
  L -->|clinical-records| O[phiWriteLimiter 30/15min]
  M --> P[router]
  N --> P
  O --> P
  L --> P
  P --> Q[authMiddleware<br/>token_version/active/revoked/expires]
  Q --> R[authorize roles]
  R --> S[validateZod]
  S --> T[controller -> service]
  T --> U[errorHandler]
```

## D2. CSRF double-submit

```mermaid
sequenceDiagram
  participant FE as Frontend
  participant API as API (csrfProtection)
  FE->>API: GET / (sin cookie csrf_token)
  API-->>FE: Set-Cookie csrf_token (no-httpOnly) + next() [FND-F2]
  FE->>FE: leer document.cookie -> csrf_token
  FE->>API: POST /api/... (cookie csrf_token + header X-CSRF-Token)
  API->>API: header == cookie ?
  alt coinciden
    API-->>FE: 200/201
  else no coinciden o falta
    API-->>FE: 403 CSRF inválido
  end
```

## D3. Validación de entorno/secretos

```mermaid
flowchart TD
  S[validateEnvSecurity] --> JWT{JWT_SECRET ok?}
  JWT -->|no| X[throw abort arranque]
  JWT -->|sí| CK{COOKIE_SECRET<br/>≥32 y ≠ JWT?}
  CK -->|no| X
  CK -->|sí| HM{AUDIT_HMAC_SECRET?}
  HM -->|no| X
  HM -->|sí| DB{DATABASE_URL?}
  DB -->|no| X
  DB -->|sí| EN{ENCRYPTION_KEY?}
  EN -->|no| W[warn: 2FA off]
  EN -->|sí| RC{RECAPTCHA prod?}
  W --> RC
  RC -->|falta o test-key| X
  RC -->|ok| OK[app.listen]
  X --> ABORT[proceso no arranca]
```

## D4. Almacenamiento de secretos TOTP

```mermaid
flowchart LR
  P[TOTP secret] --> K[PBKDF2 100k sha256<br/>ENCRYPTION_KEY + salt]
  K --> A[AES-256-GCM]
  A --> F["formato iv:tag:salt:ciphertext"]
  F --> DB[(users.totp_secret cifrado)]
```
