# Fase 1 — Contexto del sistema (Etapa 1: primer tramo)

> **Estado:** INICIAL — basado en evidencia de Fase 0 y lectura de `src/app.ts`. **Certeza:** confirmado salvo indicación.

## 1. Descripción

Vitaria es un **monolito modular multi-tenant** (ADR: `docs/adr/001-monolito-modular.md`) compuesto por dos aplicaciones (API Express + SPA React) y una base de datos PostgreSQL 15 con Row-Level Security. En producción ambas aplicaciones se sirven desde Render (`render.yaml`); en desarrollo conviven vía Docker Compose con proxy de Vite.

## 2. Sistemas externos (evidencia en código)

| Externo | Uso | Evidencia | Estado |
|---|---|---|---|
| PostgreSQL 15 | persistencia, RLS multi-tenant | `src/shared/db.ts` (pool), `db/` | confirmado |
| Mercado Pago | pagos SaaS (checkout) | `src/shared/mercadopago.service.ts` (HTTP crudo, sin SDK); aviso `src/app.ts:416-426` | confirmado (stub si falta token) |
| SMTP / correo | notificaciones, recordatorios, 2FA | `src/shared/email.service.ts` (`nodemailer`), `validateEmailConfig` en `src/app.ts:414` | confirmado |
| SendGrid | proveedor alterno de correo | `@sendgrid/mail` en deps; var `SENDGRID_API_KEY` en `render.yaml:30` | **parcialmente confirmado** — uso en código pendiente (Fase 10) |
| Sentry | monitoreo de errores | `initSentry(app)` `src/app.ts:73`, `setupExpressErrorHandler` `:293` | confirmado (DSN opcional) |
| APIs de tasas de cambio | multicurrency | `refreshRates()` `src/app.ts:511-515`, `src/shared/currencies.ts` | confirmado (proveedor a verificar) |
| reCAPTCHA | protección de formularios | `react-google-recaptcha` en frontend, `RECAPTCHA_SECRET_KEY` en `.env.example:65` | parcialmente confirmado |
| Twilio (SMS/WhatsApp) | notificaciones | solo vars en `.env.example:37-42`, `SMS_PROVIDER=log` | **no verificado** — pendiente grep en Fase 10 |
| Render | hosting API + static site | `render.yaml` | confirmado |
| GitHub Actions | CI + backup | `.github/workflows/{ci,backup}.yml` | confirmado |

## 3. Diagrama de contexto (C4 nivel 1)

```mermaid
flowchart LR
    U["Usuarios<br/>(admin, doctor, recepcionista, paciente, superadmin)"] -->|HTTPS| FE["APP-2 Frontend SPA<br/>React 19 + Vite + MUI"]
    FE -->|REST /api (axios, cookies JWT)| BE["APP-1 Backend API<br/>Express 4 + TS (monolito modular)"]
    LP["Landing estática<br/>landing-vitaria.html"] -.->|estado pendiente| FE
    BE --> DB[("APP-3 PostgreSQL 15<br/>RLS multi-tenant")]
    BE --> MP["Mercado Pago<br/>(HTTP crudo)"]
    BE --> MAIL["SMTP / SendGrid<br/>(nodemailer)"]
    BE --> SENTRY["Sentry<br/>(errores)"]
    BE --> FX["API tasas de cambio"]
    CRON["Jobs internos<br/>node-cron + reminder.job"] -.-> BE
    CI["GitHub Actions<br/>ci.yml / backup.yml"] -.->|test/build| BE
    CI -.-> DB
    R["Render<br/>vitaria-api + vitaria-frontend"] -.->|despliega| FE
    R -.-> BE

    classDef ext fill:#fff3cd,stroke:#b8860b
    class MP,MAIL,SENTRY,FX,R,CI ext
```

> **Nota de diagramación:** la herramienta `diagram-design` **no está disponible** en este entorno (verificado: sin MCP, sin skill en `~/.config/opencode/skills`, sin entrada en `opencode.json`). Se usa **Mermaid** como alternativa compatible (ya presente en el flujo de docs Markdown). Limitación registrada en `PROGRESS.md` y `DECISIONS.md`.

## 4. Fronteras de confianza (inicial)

1. **Navegador del usuario** → cookies `httpOnly` (JWT refresh) + CSRF token (verificado: `cookieParser(COOKIE_SECRET)` `src/app.ts:181`, `csrfProtection` `:188`).
2. **API Express** → única puerta a la BD; CORS con allowlist (`src/app.ts:147-169`).
3. **PostgreSQL** → RLS como última capa de aislamiento (migraciones 020-023, 025; requiere verificación de estado real, Fase 7).
4. **Pool superadmin** (`DATABASE_URL_SUPERADMIN`, rol BYPASSRLS) → separado del pool normal (`.env.example:9-11`, migración 025) — **uso en código pendiente de verificación**.

## 5. Ciclo de vida de arranque (AS-IS, `src/app.ts`)

```
startServer() → app.listen → setImmediate:
  validateEnvSecurity → validateEmailConfig → check Mercado Pago token
  → retry DB (10 intentos) → statement_timeout=30s → runMigration()
  → registerWorkers/queue → tenantService.loadFromDB() → set_tenant_id('default')
  → seeds (no producción o RUN_SEEDS=true) → startReminderJob
  → cron: refreshRates/6h, verifyAuditChain/6h, runFullCleanup/03:00
Shutdown(SIGTERM/SIGINT): stopSessionCleanup → stopQueue → pool.end (5s timeout) → Sentry.close
```

## 6. Preguntas abiertas (tramo 1)

- ¿El pool `DATABASE_URL_SUPERADMIN` se usa en algún servicio? (buscar en `src/shared`)
- ¿Estado real de RLS en la BD de producción? (NO VERIFICADO en esta fase)
- Rol de `landing-vitaria.html` en el despliegue.
