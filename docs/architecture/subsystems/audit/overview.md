# SUB-13 — Auditoría e integridad

> **Estado:** AS-IS completado · **Certeza global:** confirmado (código + SQL). Efecto en prod NO VERIFICADO.
> **Evidencia principal:** `src/modules/audit/*`, `src/jobs/audit-integrity.job.ts`, `src/shared/crypto.service.ts`, `db/security.sql` (funciones/triggers), `db/migrations/023_fix_audit_rls.sql`, `db/init.sql` (tabla `audit_logs`), `src/app.ts` (montaje + cron).

## 1. Propósito

- **Registrar** cambios sensibles en `audit_logs`: seguridad (tabla `users`) y PHI (tablas `clinical_records`, `invoices`, `payments`) mediante **triggers de base de datos**.
- **Consultar** los registros de auditoría del tenant vía `GET /api/audit` (admin/superadmin).
- **Verificar integridad** de la cadena HMAC de `audit_logs` con `verifyAuditChain`, programada como cron cada 6 horas.

## 2. Componentes

| Capa | Módulo | Rol |
|---|---|---|
| HTTP | `audit.routes/controller/service` | Listado paginado de `audit_logs` por tenant |
| Frontend | `frontend/src/modules/audit/*` | Página de auditoría (tabla, filtros, paginación, detalle) |
| Job | `jobs/audit-integrity.job.ts` | `verifyAuditChain(tenantId?)` — verificación de cadena HMAC (cron 6h) |
| App | `audit.service.logAction` | Escritura app-level de auditoría (**no invocada — código muerto**) |
| Crypto | `shared/crypto.service.ts` | `computeHmac`, `getAuditHmacSecret`, `hashToken` |
| DB | `security.sql` | Funciones `audit_security_changes` / `audit_phi_changes` + triggers `security_audit`, `phi_audit` |
| DB | `migrations/023` | Política permissiva INSERT `audit_write` sobre `audit_logs` (FORCE RLS) |
| DB | `init.sql` | Tabla `audit_logs` (incluye `hash`, `previous_hash`) + índices |

## 3. Superficie HTTP (`/api/audit`)

Montado en `app.ts:275` → `app.use(`${API_PREFIX}/audit`, auditRoutes)`.

| Método | Ruta | Auth | Notas |
|---|---|---|---|
| GET | `/api/audit` | authMiddleware + `authorize('admin','superadmin')` | Filtros: `user_id`, `action`, `resource_type`/`entity_type`, `start_date`, `end_date`, `limit` (máx 100), `page`; superadmin puede filtrar por `tenant_id` |

## 4. Escritura de auditoría (AS-IS)

- **Triggers DB** (fuente real de datos):
  - `audit_security_changes()` sobre `users` (`AFTER INSERT OR UPDATE OR DELETE`): audita DELETE y UPDATE (sólo si cambian `password`, `role`, `active`, `blocked_until`, `totp_enabled`); sanitiza (`to_jsonb(NEW) - 'password' - 'totp_secret'`). **INSERT no se registra**.
  - `audit_phi_changes()` sobre `clinical_records`, `invoices`, `payments`: registra INSERT/UPDATE/DELETE con metadatos mínimos (`id`, `patient_id`, `doctor_id`, `status`, `created_at`) — **sin PHI cruda**.
  - `tenant_id = COALESCE(NEW.tenant_id, 'system')`; **`user_id` siempre `NULL`**; **`hash`/`previous_hash` no se asignan** (quedan `NULL`).
- **App-level** `auditService.logAction` calcularía `hash`/`previous_hash` encadenados, pero **no se invoca desde ningún punto del código** (ver FND-M5).

## 5. Roles/alcance

- **admin/superadmin**: lectura de `audit_logs` del tenant (`tenant_id = req.tenant_id`); el superadmin puede indicar otro `tenant_id` en query.
- No hay endpoint de escritura de auditoría (sólo triggers).

## 6. Integridad (AS-IS)

- `verifyAuditChain(tenantId?)` (cron 6h, `app.ts:517-529`) recorre `audit_logs` `ORDER BY created_at ASC, id ASC` y, por fila, verifica:
  - enlace: `previousHash === row.previous_hash` (inicia en `null`);
  - hash: `computeHmac(previous_hash||'|'||action||'|'||tenant_id) === row.hash`.
- **Defecto crítico:** la canonical del verificador no coincide con la de `logAction` y las filas de los triggers no llevan hash → la verificación no es efectiva (FND-M1).

## 7. Notas (AS-IS)

- `logAction` toma el último hash **global** (`ORDER BY created_at DESC LIMIT 1`, sin tenant) — ver FND-M4.
- `getAuditLogs` devuelve un array (sin `total`/metadatos de paginación) — FND-M6.
- `hashToken` (auth) reutiliza `computeHmac` → depende de `AUDIT_HMAC_SECRET` — FND-M7.
- `audit_logs` no tiene trigger que impida UPDATE/DELETE; la protección es por REVOKE a `clinic_app` — FND-M8.

## 8. NO VERIFICADO

- Estado real de `audit_logs` en producción (si contiene filas con `hash` no nulo de una versión previa).
- Si existe un trigger HMAC en una migración no versionada en el repo.
- Resultado real del cron de verificación (por diseño, reportaría `brokenLinks>0`).
- Presente/ausencia de `AUDIT_HMAC_SECRET` en prod (requerido por `getAuditHmacSecret`).
