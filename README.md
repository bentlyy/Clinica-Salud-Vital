# Clínica Salud Vital — Sistema de Gestión Clínica

Full-stack clinical management system with agenda médica, EHR, billing, lab, ML predictions, 2FA, webhooks, multi-tenancy, i18n, and multi-channel notifications.

---

## Quick Start

```bash
git clone <repo> && cd clinic-backend
npm install
docker compose up -d db
cp .env.example .env
npm run dev
```

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server (tsx watch) |
| `npm start` | Production (node dist/app.js) |
| `npm test` | Tests + coverage |
| `npm run build` | Compile TS + build frontend |
| `npm run typecheck` | TypeScript check |

---

## Stack

`React 19` · `Vite 6` · `Express 5` · `TypeScript` · `PostgreSQL 15` · `TensorFlow.js` · `Zod 4` · `JWT + Refresh Tokens` · `TOTP 2FA` · `SendGrid / Nodemailer` · `Twilio` · `PDFKit` · `Vitest` · `Helmet` · `node-cron`

---

## Modules (16)

| Module | Features |
|--------|----------|
| **Auth** | Register, Login, Refresh, Logout, 2FA (TOTP), Change Password |
| **Booking** | Create/Cancel/List, available slots, doctor agenda, auto-confirmed |
| **Doctor** | Register, profile, user mgmt, toggle active |
| **Availability** | Weekly blocks, CRUD, no overlap |
| **Exception** | Full/partial day blocks |
| **Specialties** | Medical specialties catalog |
| **Guest** | Booking without login, RUT lookup, cancel |
| **Confirmation** | Email token confirmation |
| **Clinical Record** | EHR, prescriptions, CIE-10 search, PDF download |
| **Analytics** | Dashboard KPIs, charts, ML forecast, Excel export |
| **Billing** | Invoices, payments, insurance claims |
| **Laboratory** | Test catalog, lab requests, results |
| **Audit** | Audit logs (admin only) |
| **RBAC** | Granular roles & permissions |
| **ML** | 4 TensorFlow.js models: no-show, diagnosis, demand, vitals |
| **Webhooks** | CRUD, event dispatch, HMAC-SHA256, delivery log |

---

## Key Features

- **Auth**: JWT access (15min) + refresh (30d) with rotation, bcrypt 12 rounds, 2FA TOTP
- **Security**: Helmet, HPP, CORS, rate limiting (500/15min), Zod validation, RBAC, audit logs, advisory locks
- **Multi-tenancy**: Shared DB, subdomain/X-Tenant-Id resolution, per-tenant config
- **i18n**: 4 locales (es/en/pt/fr), 421+ keys, frontend hook with localStorage cache
- **Notifications**: Email (SendGrid + Gmail SMTP fallback), SMS/WhatsApp (Twilio), node-cron reminders
- **ML**: 4 TF.js models, LRU cache, metrics middleware, demand forecasting
- **API**: Paginated responses, Zod validation, async error handling, versioned `/api/v1/`
- **Testing**: 1122 tests, 93 files, 89% line coverage, Vitest + Supertest

---

## Seed Users

| Rol | Email | Password |
|-----|-------|----------|
| Admin | admin@clinic.com | REPLACED_PASSWORD |
| Doctor | juan@clinic.com | REPLACED_PASSWORD |
| Patient | user1@clinic.com | REPLACED_PASSWORD |

---

## Ports

API `3000` · Frontend `5173` · PostgreSQL `5432`

---

## License

ISC
