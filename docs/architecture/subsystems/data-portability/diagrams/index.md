# SUB-14 — Diagramas

> Formato Mermaid (decisión D-1). Fuente: `src/modules/{data-portability,webhooks}/*`, `src/shared/queue.service.ts`, `db/init.sql`, `db/migrations/017_webhook_subscriptions.sql`.

## D1. Módulos, rutas y almacenamiento

```mermaid
flowchart LR
  EXP["/api/export"] --> DPC[data-portability.controller] --> DPS[data-portability.service]
  DPS --> TBL[(users/bookings/records/lab/invoices/...)]
  WHK["/api/webhooks"] --> WC[webhooks.controller] --> WS[webhooks.service]
  WS --> WSUB[(webhook_subscriptions)]
  WS -. no escribe .-> WDEL[(webhook_deliveries)]
  WS --> Q[(jobs)]
```

## D2. Pipeline de webhooks (puntos muertos)

```mermaid
flowchart TD
  DOM["Eventos de dominio (booking.created, result.ready, ...)"] -.->|NO conectado — FND-N1| DE["dispatchEvent()"]
  DE --> ENQ[enqueueJob webhook:dispatch]
  ENQ --> Q[(jobs)]
  Q --> WRK["worker webhook:dispatch (registrado)"]
  WRK --> DH[dispatchWebhook] --> HTTP[fetch POST + HMAC]
  HTTP -.->|nunca| WDEL[(webhook_deliveries — FND-N5)]
```

## D3. Seguridad de URLs (SSRF) y secreto

```mermaid
flowchart TD
  U["url (create/update)"] --> AV[assertValidUrl]
  AV --> PROTO["protocolo http/https"]
  AV --> IPCHK["bloquea 127./10./172.16-31./192.168./169.254./localhost/::1"]
  IPCHK --> OK["aceptada"]
  OK --> FETCH["dispatchWebhook: fetch(redirect: follow)"]
  FETCH --> BYPASS["redirect/DNS-rebinding puede alcanzar IP interna (FND-N3)"]
  SEC["secret: randomBytes(32)"] --> PLAIN["guardado TEXT en claro (FND-N2)"]
```

## D4. Export RGPD (AS-IS)

```mermaid
flowchart LR
  ME["GET /me"] --> EP[exportPatientData]
  PID["GET /patients/:id (admin/doctor/superadmin/patient)"] --> EP
  EP --> AGG["agrega users+clinical+admin (Promise.all)"]
  AGG --> RED["redacta campos sensibles"]
  RED --> JSON["res.json({data}) + Content-Disposition"]
  EP -.->|no soportado| DEL["borrado/supresión (derecho al olvido) — FND-N4"]
```
