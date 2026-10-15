# SUB-13 — Archivos

> Rutas relativas a la raíz del repo.

## Backend

| Archivo | Líneas | Rol |
|---|---|---|
| `src/modules/audit/audit.routes.ts` | 13 | Router; guard admin/superadmin; `GET /` |
| `src/modules/audit/audit.controller.ts` | 31 | `getAuditLogs`; filtros y resolución de `tenant_id` |
| `src/modules/audit/audit.service.ts` | 102 | `logAction` (muerta), `computeAuditHash`, `getAuditLogs` |
| `src/jobs/audit-integrity.job.ts` | 41 | `verifyAuditChain(tenantId?)` |
| `src/shared/crypto.service.ts` | 77 | `computeHmac`/`getAuditHmacSecret`/`hashToken` (crypto compartido) |
| `src/app.ts` | — | Import (`:16,50`), montaje `:275`, cron verificación `:517-529` |

## Base de datos

| Archivo | Elementos |
|---|---|
| `db/init.sql` | Tabla `audit_logs` (`:186-198`), índices (`:850`) |
| `db/security.sql` | Función `audit_security_changes` (`:260-294`) + trigger `security_audit` (`:296-301`); función `audit_phi_changes` (`:308-346`) + triggers `phi_audit` (`:348-367`); índices hash (`:390-391`); RLS `tenant_isolation` sobre `audit_logs` |
| `db/migrations/023_fix_audit_rls.sql` | Política `audit_write` (INSERT permissivo) `:36-43` |
| `db/migrations/027_performance_indexes.sql` | Índice `idx_audit_logs_created` (`:16-17`), `idx_audit_logs_user` (`:20-21`) |

## Frontend

| Archivo | Líneas | Rol |
|---|---|---|
| `frontend/src/modules/audit/pages/AuditPage.tsx` | 327 | Página de auditoría (tabla, filtros, paginación, detalle) |
| `frontend/src/modules/audit/components/AuditDetailDialog.tsx` | 162 | Diálogo de detalle de un registro |
| `frontend/src/modules/audit/hooks/useAudit.ts` | 16 | `useAuditList` (TanStack Query, staleTime 30s) |
| `frontend/src/modules/audit/services/audit.service.ts` | 12 | `auditService.list` → `GET /audit` (acepta array o `PaginatedResponse`) |
| `frontend/src/modules/audit/types/audit.types.ts` | 117 | Tipos `AuditLog`/`AuditListParams` |

## Tests existentes

- **Backend:** `tests/` incluye pruebas de auditoría/RLS (`tests/integration/rls-isolation.test.js`); verificación de cadena en tests (no confirmado en detalle).
- **Frontend:** módulo `frontend/src/modules/audit/` presente (página/hook/servicio/tipos); sin tests dedicados detectados.

## Cross-ref

- `src/shared/crypto.service.ts` también usado por SUB-2 (auth: `encrypt`/`decrypt`/`hashToken`).
- `audit_logs` referenciado por SUB-11 (super-admin) y `db/security.sql` (SUB-4/SUB-15).
- Frontend `audit.service.list` tolera respuesta array (no paginada) → consecuencia de FND-M6.
