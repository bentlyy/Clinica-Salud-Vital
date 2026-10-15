# SUB-18 — Dependencias

## Backend — externas

| Dependencia | Uso |
|---|---|
| `bcrypt` | Hash de contraseñas seed (cost 12) |
| `pg` | `pool`, `superAdminPool` |
| `node-cron` | Crones tras el seed (reminder/rates/audit/cleanup) |

## Backend — internas

| Origen | Destino | Nota |
|---|---|---|
| `app.ts` | `seed/*` | Orquestación post-boot, todo `try/catch` none-fatal |
| `auth.service` | `admin.seed` | `DEMO_TENANT_ID`, `DEMO_ADMIN_EMAIL` para login demo |
| `seed.ts` | `shared/db.pool` | Sin transacción |
| `admin.seed.ts` | `shared/db.superAdminPool` | Creación de tenants (BYPASSRLS) |
| `admin.seed.ts` | `shared/currencies` | `tenantCurrency`, `convertFromUsd` en facturas |

## Base de datos

| Objeto | Uso |
|---|---|
| `tenants`, `subscriptions`, `plans` | Tenants de prueba |
| `users`, `doctors`, `doctor_availability`, `doctor_exceptions` | Personas y agenda |
| `bookings`, `clinical_records`, `prescriptions`, `medical_history` | Clínica |
| `lab_areas/lab_tests/lab_equipment/lab_reagents/lab_qc_records/lab_requests/lab_request_items/lab_notifications` | Laboratorio (plan pro) |
| `invoices`, `subscription_invoices` | Facturación |
| `audit_logs` | Auditoría demo |
| `refresh_tokens`, `bookings` (constraint) | DDL en runtime |

## Variables de entorno

| Variable | Uso |
|---|---|
| `NODE_ENV` | Gate principal (prod desactiva seeds) |
| `RUN_SEEDS` | Fuerza seeds en prod |
| `SEED_ON_STARTUP` | Gate interno de `seed()` |
| `ADMIN_PASSWORD` / `SUPERADMIN_PASSWORD` | Credenciales iniciales |
| `DEFAULT_TENANT_ID` | Tenant por defecto |
