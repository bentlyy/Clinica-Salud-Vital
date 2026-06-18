# Deploy en Render

> Configuración de despliegue en Render.

## Configuración

Archivo: `render.yaml`

```yaml
services:
  - type: web
    name: clinic-api
    env: node
    region: oregon
    plan: free
    buildCommand: npm install && npm run build
    preDeployCommand: node dist/scripts/migrate.js
    startCommand: npm start
    healthCheckPath: /health
```

## Variables de Entorno en Render

| Variable | Sync | Descripción |
|----------|------|-------------|
| `NODE_ENV` | production | Fijo |
| `PORT` | 3000 | Fijo |
| `DATABASE_URL` | Secreto | Connection string |
| `JWT_SECRET` | Secreto | JWT signing |
| `FRONTEND_URL` | Secreto | CORS origin |
| `PHI_MASTER_KEY` | Secreto | Cifrado PHI |
| `AUDIT_HMAC_SECRET` | Secreto | Auditoría |
| `ENCRYPTION_KEY` | Secreto | 2FA secrets |
| `INVITE_JWT_SECRET` | Secreto | Invitaciones |

## Health Check

Endpoint: `GET /health`
- Verifica conectividad con DB
- Retorna status de cada servicio

---

Tags: #devops #deploy #render
