# SUB-13 — Módulos

> Backend: `SUB13-U*`. Auditoría se escribe principalmente por **triggers de BD**; el módulo HTTP sólo lee.

| ID | Unidad | Tipo | Archivo | Responsabilidad |
|---|---|---|---|---|
| SUB13-U1 | audit.routes | Router | `src/modules/audit/audit.routes.ts` | `authMiddleware` + `authorize('admin','superadmin')`; `GET /` |
| SUB13-U2 | audit.controller | Controller | `src/modules/audit/audit.controller.ts` | Parsea filtros; resuelve `tenant_id` (superadmin override); responde array |
| SUB13-U3 | audit.service | Service | `src/modules/audit/audit.service.ts` | `logAction` (**muerta**) + `computeAuditHash` + `getAuditLogs` (paginado) |
| SUB13-U4 | audit-integrity.job | Job | `src/jobs/audit-integrity.job.ts` | `verifyAuditChain(tenantId?)`; cron 6h |
| SUB13-U5 | crypto.service | Infra | `src/shared/crypto.service.ts` | `computeHmac`, `getAuditHmacSecret`, `hashToken` (comparte secreto con auth) |
| SUB13-U6 | audit_security_changes | Trigger DB | `db/security.sql:260-301` | Audita `users` (UPDATE/DELETE; INSERT no) |
| SUB13-U7 | audit_phi_changes | Trigger DB | `db/security.sql:308-367` | Audita PHI (`clinical_records`, `invoices`, `payments`) |

## Endpoints por unidad

- **U1/U2**: `GET /api/audit`.

## Frontend (`MOD-f-audit`)

| ID | Unidad | Tipo | Archivo | Responsabilidad |
|---|---|---|---|---|
| MOD-f-audit | AuditPage | Página | `frontend/src/modules/audit/pages/AuditPage.tsx` | Tabla + filtros + paginación + detalle de `audit_logs` |
| MOD-f-audit | AuditDetailDialog | Componente | `frontend/src/modules/audit/components/AuditDetailDialog.tsx` | Detalle de un registro |
| MOD-f-audit | useAudit | Hook | `frontend/src/modules/audit/hooks/useAudit.ts` | `useAuditList` (React Query) |
| MOD-f-audit | audit.service | Service | `frontend/src/modules/audit/services/audit.service.ts` | `GET /audit` → normaliza array o `PaginatedResponse` |
| MOD-f-audit | audit.types | Tipos | `frontend/src/modules/audit/types/audit.types.ts` | `AuditLog`, `AuditListParams` |

## Observaciones de módulo

- `logAction` (U3) implementa una cadena HMAC pero **no se invoca** en ningún módulo → el `hash`/`previous_hash` de la tabla no se puebla (U6/U7 insertan sin hash).
- `computeAuditHash` incluye `Date.now()` y ordena claves de `old_values`/`new_values`, mientras que el verificador (U4) usa una canonical reducida → verificación no reproducible (FND-M1).
- `hashToken` (U5) reutiliza `computeHmac` → acopla los tokens de autenticación con `AUDIT_HMAC_SECRET` (FND-M7).
