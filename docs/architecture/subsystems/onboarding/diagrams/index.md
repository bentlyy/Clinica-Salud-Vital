# SUB-19 — Diagramas (Onboarding público, aplicaciones y legal)

## D1. Módulos, rutas y tablas

```mermaid
flowchart TD
  subgraph Frontend
    LAND["LandingPage / (precios hardcoded)"]
    CONTR["OnboardingContractPage /contratar"]
    THANKS["ThankYouPage /gracias"]
    CLINIC["ClinicOnboardingPage /settings/onboarding"]
    SUPER["SuperAdminOnboardingPage /onboarding-applications"]
    LEGAL["PrivacyPolicyPage /privacidad · TermsPage /terminos"]
  end
  subgraph API["Backend /api/saas"]
    PLANS["GET /plans (publico)"]
    ONB["POST /onboard (publico + limiter + captcha)"]
    PROF["GET|PATCH /onboarding"]
    DOCS["/onboarding/documents (+download,delete)"]
    APPS["/onboarding/applications (+approve,reject)"]
  end
  subgraph DB
    T["tenants"]
    U["users"]
    S["subscriptions"]
    I["subscription_invoices"]
    TO["tenant_onboarding"]
    OD["onboarding_documents"]
  end
  LAND --> CONTR --> ONB
  CONTR -. GET .-> PLANS
  CONTR --> THANKS
  CLINIC --> PROF --> TO
  CLINIC --> DOCS --> OD
  SUPER --> APPS --> TO
  ONB --> T & U & S & I & TO & OD
```

## D2. Alta pública transaccional (`onboardTenant`)

```mermaid
flowchart TD
  REQ["POST /saas/onboard (payload base64)"] --> CAP{"verifyCaptchaOnboard"}
  CAP -->|sin secret o TEST key| OK["true (abre)"]
  CAP -->|token invalido| FAIL["400 SAAS_CAPTCHA_FAILED"]
  OK --> TX["BEGIN (superAdminPool)"]
  TX --> CHK{"tenants id/domain existe?"}
  CHK -->|si| DUP["400 SAAS_DOMAIN_EXISTS + ROLLBACK"]
  CHK -->|no| INS1["INSERT tenants (active=true)"]
  INS1 --> INS2["INSERT users (role=admin)"]
  INS2 --> SUB{"planCode?"}
  SUB -->|si| SUB1["INSERT subscriptions status=active"]
  SUB1 --> SUB2["INSERT subscription_invoices status=paid"]
  SUB -->|no| ONBO
  SUB2 --> ONBO["insertOnboarding (status=pending)"]
  ONBO --> DOCS{"documents?"}
  DOCS -->|si| DOC1["insertOnboardingDocuments (fs + tabla)"]
  DOC1 --> CM["COMMIT"]
  DOCS -->|no| CM
  CM --> CACHE["tenantService.loadFromDB()"] --> RESP["201 {tenantId, subscription, message}"]
```

## D3. Ciclo de la solicitud y su efecto real en el tenant

```mermaid
stateDiagram-v2
  [*] --> pending: onboard crea tenant + onboarding
  note right of pending
    tenants.active = true (ya activo)
    admin puede iniciar sesion
  end note
  pending --> approved: PATCH .../approve
  note right of approved
    approveOnboardingApplication
    UPDATE tenants SET active=true (no-op)
  end note
  pending --> rejected: PATCH .../reject { reason }
  note right of rejected
    solo cambia status
    NO desactiva el tenant ni al admin  (FND-S2)
  end note
```

## D4. Carga de documentos en base64 y el límite del body

```mermaid
flowchart LR
  FILE["File del navegador"] --> B64["fileToBase64()"]
  B64 --> JSON["JSON { data_base64 }"]
  JSON --> MW["express.json({limit:'100kb'})"]
  MW -->|>100 KB| E413["413 Payload Too Large"]
  MW -->|<=100 KB| CTRL["controller / insertOnboardingDocumentFile"]
  CTRL --> MIME{"ALLOWED_MIME?"}
  MIME -->|no| E400A["400 SAAS_DOCUMENT_TYPE_INVALID"]
  MIME -->|si| SIZE{"<= MAX_FILE_BYTES?"}
  SIZE -->|no| E400B["400 SAAS_DOCUMENT_TOO_LARGE"]
  SIZE -->|si| FS["fs.writeFile(UPLOAD_ROOT/onboarding/<id>)"] --> ROW["INSERT onboarding_documents"]
```
Nota: `MAX_FILE_BYTES` nunca se alcanza desde el formulario porque el body JSON (100 KB) corta
antes (base64 infla +33% ≈ 72 KB útiles). Ver FND-S4 / FND-K1.
