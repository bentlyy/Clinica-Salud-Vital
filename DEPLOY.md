# 🚀 Deployment Guide — Frontend v3

## Overview

The project has migrated from **frontend v1** (`frontend/`) to **frontend v3** (`frontend-v3/`).

- **Backend**: Node.js + Express on Render (or Docker)
- **Frontend**: React 19 + Vite + MUI on Render Static Site (or Docker + nginx)
- **Database**: PostgreSQL on AWS RDS

---

## Branch Strategy

```
main ──────────────────────────────────────────────► Production
  │
  └── develop ─────────────────────────────────────► Staging
        │
        └── feature/* ─────────────────────────────► Development
```

| Branch | Render Service | Purpose |
|--------|---------------|---------|
| `main` | `clinic-api` + `clinic-frontend` | Production |
| `develop` | `clinic-api-staging` + `clinic-frontend-staging` | Staging/QA |
| `feature/*` | Local Docker only | Development |

### How to Deploy

#### Automatic (via Render)
1. Push to `main` → Render auto-deploys to production
2. Push to `develop` → Render auto-deploys to staging

#### Manual (via Docker)
```bash
# Production
docker compose -f docker-compose.prod.yml up -d --build

# Development (with hot reload)
docker compose up -d
```

---

## Environment Variables

### Production (Render Dashboard)

Set these in the Render dashboard under each service:

**Backend (`clinic-api`)**:
```
DATABASE_URL=postgresql://user:password@your-rds-host:5432/clinic
JWT_SECRET=<your-production-secret>
FRONTEND_URL=https://yourdomain.com
PHI_MASTER_KEY=<64-hex-chars>
AUDIT_HMAC_SECRET=<32+ chars>
ENCRYPTION_KEY=<32-hex-chars>
INVITE_JWT_SECRET=<32+ chars>
SUPERADMIN_PASSWORD=<strong-password>
RECAPTCHA_SECRET_KEY=<your-recaptcha-secret>
DB_CA_CERT=<aws-rds-ca-cert>
```

**Frontend (`clinic-frontend`)**:
```
VITE_API_URL=/api
```

> **Note**: `VITE_API_URL=/api` makes the frontend proxy API calls through nginx to the backend. In production, the frontend and backend are served from the same domain.

### Local Development (.env)

```bash
# Database (local Docker or AWS RDS)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/clinic
# OR for AWS RDS:
# DATABASE_URL=postgresql://user:password@your-rds-host:5432/clinic

# Frontend
VITE_API_URL=http://localhost:3000/api
FRONTEND_URL=http://localhost:5173
```

---

## AWS RDS Connection

The backend connects to AWS RDS using the `DATABASE_URL` environment variable.

### Required: CA Certificate

AWS RDS requires SSL with a CA certificate. The certificate is stored in `DB_CA_CERT` env var.

### Security Group Rules

Ensure your RDS security group allows:
- **Type**: PostgreSQL (5432)
- **Source**: Render's outbound IPs (or `0.0.0.0/0` for testing)

---

## Docker Architecture

### Development (`docker-compose.yml`)
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Frontend   │────►│   Backend   │────►│  PostgreSQL  │
│  (Vite dev)  │     │  (Express)  │     │  (Docker)    │
│  :5173       │     │  :3000      │     │  :5432       │
└─────────────┘     └─────────────┘     └─────────────┘
```

### Production (`docker-compose.prod.yml`)
```
┌─────────────┐     ┌─────────────┐
│   Frontend   │────►│   Backend   │────► AWS RDS
│  (nginx)     │     │  (Express)  │
│  :80         │     │  :3000      │
└─────────────┘     └─────────────┘
```

### Render (Cloud)
```
┌──────────────────┐     ┌──────────────────┐
│  Static Site      │────►│  Web Service      │
│  (clinic-frontend)│     │  (clinic-api)     │
│  *.onrender.com   │     │  *.onrender.com   │
└──────────────────┘     └──────────────────┘
                                │
                                ▼
                         ┌──────────────┐
                         │  AWS RDS      │
                         │  PostgreSQL   │
                         └──────────────┘
```

---

## Frontend Build

The frontend v3 uses Vite for building. The build output is in `frontend-v3/dist/`.

### Build Commands

```bash
# Local development
cd frontend-v3 && npm run dev

# Production build
cd frontend-v3 && npm run build

# From root (used by Render)
npm run build  # builds backend + frontend-v3
```

### Build Output

```
frontend-v3/dist/
├── index.html
├── assets/
│   ├── index-[hash].js      # Main bundle
│   ├── index-[hash].css     # Styles
│   ├── vendor-[hash].js     # React, React DOM
│   ├── mui-[hash].js        # MUI components
│   ├── charts-[hash].js     # Recharts
│   ├── calendar-[hash].js   # FullCalendar
│   └── ...
└── ...
```

---

## Troubleshooting

### Frontend not loading in production
1. Check that `VITE_API_URL=/api` is set (not a full URL)
2. Verify nginx is serving `index.html` for all routes
3. Check Render build logs for errors

### API calls failing from frontend
1. Ensure backend is running and healthy
2. Check CORS settings in backend
3. Verify `FRONTEND_URL` matches your frontend domain

### Database connection errors
1. Verify `DATABASE_URL` is correct
2. Check AWS RDS security group allows Render's IPs
3. Ensure `DB_CA_CERT` is set for SSL connections

---

## Rollback Procedure

If the new frontend has issues:

1. **Quick rollback**: Revert the `render.yaml` change and redeploy
2. **Docker rollback**: Use the previous docker-compose
3. **Code rollback**: `git revert` the problematic commit

```bash
# Revert last commit
git revert HEAD

# Push to trigger redeploy
git push origin main
```
