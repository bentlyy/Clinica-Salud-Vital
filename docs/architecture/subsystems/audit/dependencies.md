# SUB-13 — Dependencias

## Backend — externas

| Dependencia | Uso |
|---|---|
| `crypto` (node) | `createHmac('sha256', ...)` en `computeHmac`; AES-GCM en `encrypt`/`decrypt` |
| `express` | Router/controller de auditoría |
| `pg` | Consultas a `audit_logs` |

## Backend — internas

| Origen | Destino | Nota |
|---|---|---|
| `audit.controller` | `shared/query.getQuery`/`getQueryInt` | Filtros de listado |
| `audit.service` | `shared/db.pool` | SELECT/INSERT en `audit_logs` |
| `audit.service` | `shared/crypto.service.computeHmac` | Hash de cadena (en `logAction`, muerta) |
| `audit-integrity.job` | `shared/db.pool` | SELECT de la cadena |
| `audit-integrity.job` | `shared/crypto.service.computeHmac` | Recompute del hash esperado |
| `audit-integrity.job` | `utils/logger` | Avisos de violación |
| `app.ts` | `audit.routes` (`:275`), `verifyAuditChain` (`:16,519`) | Montaje + cron |
| `crypto.service.hashToken` | `computeHmac` | Reutiliza `AUDIT_HMAC_SECRET` (acoplamiento con auth) |

## Base de datos

| Objeto | Uso |
|---|---|
| `audit_logs` | Almacén de auditoría (INSERT por triggers; SELECT por API/cron) |
| `users` | Disparador `security_audit` |
| `clinical_records`, `invoices`, `payments` | Disparador `phi_audit` |
| `current_setting('app.tenant_id')` | Políticas RLS (`tenant_isolation`, `audit_write`) |
| `_migrations`, role `clinic_app` | Permisos (REVOKE) — SUB-15 |

## Variables de entorno

| Variable | Uso | Requerida |
|---|---|---|
| `AUDIT_HMAC_SECRET` | Secreto HMAC de la cadena de auditoría (`getAuditHmacSecret`, ≥32 chars) | Sí (lanza error si falta) — también usada por `hashToken` |
| `ENCRYPTION_KEY` | (crypto compartido) AES-GCM | Sí (para cifrado PHI) |

## Cross-ref a otros subsistemas

- **SUB-2 (auth)**: `crypto.service` (`hashToken`, `encrypt`/`decrypt`).
- **SUB-4 (seguridad) / SUB-15 (BD)**: `db/security.sql`, RLS y REVOKE sobre `audit_logs`.
- **SUB-11 (billing/SaaS)**: `audit_logs` para tenants / superadmin.
- **SUB-10 (notificaciones)**: cron `verifyAuditChain` convive con `reminder.job`.

## Frontend

| Origen | Destino | Nota |
|---|---|---|
| `modules/audit/services/audit.service` | `shared/services/api-client` | `GET /audit` |
| `modules/audit/hooks/useAudit` | `@tanstack/react-query` | `useAuditList` |
| `modules/audit/pages/AuditPage` | `useAudit` + `AuditDetailDialog` + `audit.types` | UI de auditoría |
