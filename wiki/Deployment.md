# Despliegue

## Render

```bash
# Push a GitHub → Crear Web Service en Render
Build Command: npm install && npm run build
Start Command: npm start
```

### Variables de Entorno
| Variable | Descripción |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL URL |
| `JWT_SECRET` | Clave JWT (≥32 chars) |
| `FRONTEND_URL` | URL del frontend |
| `SENDGRID_API_KEY` | SendGrid (email principal) |
| `EMAIL_USER` / `EMAIL_PASS` | Gmail SMTP (fallback) |
| `RECAPTCHA_SECRET_KEY` | reCAPTCHA v2 |
| `STRIPE_SECRET_KEY` | Stripe (opcional) |
| `APP_LOCALE` | es/en/pt/fr |

## Docker (Local)

```bash
docker compose up -d db   # PostgreSQL
npm run dev                # API + Frontend
```

## Comandos

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Dev server (tsx watch) |
| `npm start` | Producción (node dist/app.js) |
| `npm test` | Tests + coverage |
| `npm run build` | Compilar TS + build frontend |
| `npm run build:backend` | Compilar TS (tsc) |
| `npm run build:frontend` | Build frontend (Vite) |

## Puertos
| Servicio | Puerto |
|----------|--------|
| API | 3000 |
| Frontend | 5173 |
| PostgreSQL | 5432 |
