# Deploy en Render

> Configuración de despliegue en Render (backend web + frontend estático).

## Configuración

Archivo: `render.yaml`

```yaml
services:
  - type: web             # Backend API
    name: vitaria-api
    env: node
    region: oregon
    plan: free
    buildCommand: npm install --include=dev && npm run build
    startCommand: npm start
    healthCheckPath: /health
    envVars:
      - key: NODE_ENV, value: production
      - key: PORT, value: 3000
      - key: TOTP_ISSUER, value: Vitaria
      - key: SMS_PROVIDER, value: log
      - key: DEFAULT_TENANT_ID, value: default
      - key: APP_LOCALE, value: es
      - key: LOG_LEVEL, value: info
      # + variables secretas (sync: false)

  - type: static_site     # Frontend
    name: vitaria-frontend
    buildCommand: cd frontend && npm install --include=dev && npm run build
    staticPublishPath: ./frontend/dist
    routes:
      - type: rewrite
        from: /*
        to: /index.html     # SPA fallback
```

> No hay `preDeployCommand`: la base de datos se gestiona mediante **migraciones al arrancar** (runner en `src/app.ts`), no con un script de deploy separado.

## Variables de Entorno en Render

### Backend (`vitaria-api`)

| Variable | Tipo | Descripción |
|----------|------|-------------|
| `NODE_ENV` | fija | `production` |
| `PORT` | fija | `3000` |
| `DATABASE_URL` | secreta | Connection string PostgreSQL (externo, con SSL + `DB_CA_CERT`) |
| `JWT_SECRET` / `JWT_PRIVATE_KEY` / `JWT_PUBLIC_KEY` | secretas | Firma JWT |
| `FRONTEND_URL` | secreta | Origen CORS permitido |
| `PHI_MASTER_KEY` | secreta | Cifrado de datos PHI |
| `AUDIT_HMAC_SECRET` | secreta | Cadena HMAC de auditoría (obligatoria en prod) |
| `ENCRYPTION_KEY` | secreta | Secrets 2FA (AES-256-GCM) |
| `INVITE_JWT_SECRET` | secreta | Tokens de invitación |
| `SUPERADMIN_PASSWORD` | secreta | Credencial seed superadmin (obligatoria en prod) |
| `RECAPTCHA_SECRET_KEY` | secreta | Validación reCAPTCHA (fail-closed) |
| `DB_CA_CERT` | secreta | Certificado CA de la DB externa |
| `EMAIL_USER` / `EMAIL_PASS` | secretas | SMTP fallback |
| `SENDGRID_API_KEY` | secreta | Emails transaccionales |
| `ALLOWED_DOMAINS` | secreta | Dominios permitidos |
| `TOTP_ISSUER`, `SMS_PROVIDER`, `DEFAULT_TENANT_ID`, `APP_LOCALE`, `LOG_LEVEL` | fijas | Config general |

> 🚨 Validación al boot: `validateEnvSecurity()` **aborta en producción** si faltan `AUDIT_HMAC_SECRET`; el seed aborta sin `SUPERADMIN_PASSWORD`/`ADMIN_PASSWORD`.

### Frontend (`vitaria-frontend`)

| Variable | Tipo | Descripción |
|----------|------|-------------|
| `VITE_API_URL` | fija | `/api` (mismo dominio vía proxy) |
| `VITE_RECAPTCHA_SITE_KEY` | secreta | Site key de reCAPTCHA |

## Health Check

Endpoint: `GET /health`
- Verifica conectividad con DB y estado de pool, Stripe
- Es usado por Render y Docker como `healthcheck`

---

Tags: #devops #deploy #render