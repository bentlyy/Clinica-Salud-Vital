# SUB-13 — Flujos

## F1. Auditoría de seguridad por trigger (`users`)

```
UPDATE/DELETE en users
   -> TRIGGER security_audit (AFTER INSERT OR UPDATE OR DELETE)   [security.sql:296-301]
   -> audit_security_changes()  [security.sql:260-294]
        DELETE -> INSERT audit_logs(action='security_delete',
                    old_values = to_jsonb(OLD) - password - totp_secret,
                    tenant_id = COALESCE(OLD.tenant_id,'system'), user_id=NULL, created_at=NOW())
        UPDATE -> si cambió password|role|active|blocked_until|totp_enabled:
                    INSERT audit_logs(action='security_update', old/new sanitizados, user_id=NULL)
        INSERT -> (no inserta)   <-- FND-M3
   * hash y previous_hash quedan NULL   <-- FND-M1
```

## F2. Auditoría PHI por trigger

```
INSERT/UPDATE/DELETE en clinical_records | invoices | payments
   -> TRIGGER phi_audit (AFTER INSERT OR UPDATE OR DELETE)   [security.sql:348-367]
   -> audit_phi_changes()  [security.sql:308-346]
        INSERT -> action='phi_create'  (id, patient_id, doctor_id, created_at)
        UPDATE -> action='phi_update'  (old: id,status ; new: id,status)
        DELETE -> action='phi_delete'  (id, patient_id, doctor_id, created_at)
   * sanitizado (sin PHI cruda); user_id=NULL; hash/previous_hash=NULL
```

## F3. Escritura app-level prevista (`logAction`, NO usada)

```
auditService.logAction(input)   [audit.service.ts:43-67]   (sin invocadores — FND-M5)
   -> SELECT hash FROM audit_logs ORDER BY created_at DESC LIMIT 1   (global; FND-M4)
   -> computeAuditHash(previousHash, input)
        canonical = [prevHash, action, resource_type, resource_id,
                     JSON(sorted old_values), JSON(sorted new_values),
                     ip_address, tenant_id, Date.now()].join('|')
        -> HMAC-SHA256(AUDIT_HMAC_SECRET)
   -> INSERT audit_logs(... hash, previous_hash [, tenant_id])
```

## F4. Lectura de auditoría

```
GET /api/audit   (authMiddleware + authorize admin|superadmin)
   -> controller: user_id?, action?, resource_type?, start_date?, end_date?, limit(<=100), page
        tenant_id = (superadmin && query.tenant_id) ? query.tenant_id : req.tenant_id
   -> service.getAuditLogs(query)
        WHERE (tenant_id) AND (filtros...) ORDER BY created_at DESC LIMIT n OFFSET m
        LEFT JOIN users u ON al.user_id = u.id   (user_name -> NULL por FND-M2)
   -> res.json(rows)   (array; sin total — FND-M6)
```

## F5. Verificación de cadena de integridad (cron 6h)

```
cron '0 */6 * * *'  [app.ts:517-529]
   -> verifyAuditChain()   [audit-integrity.job.ts:5-41]
        SELECT id,hash,previous_hash,action,tenant_id FROM audit_logs
          [WHERE tenant_id=$1] ORDER BY created_at ASC, id ASC
        por fila:
          if previousHash !== row.previous_hash -> brokenLinks++   (enlace)
          expectedHash = HMAC([row.previous_hash||'', row.action, row.tenant_id||''].join('|'))
          if expectedHash !== row.hash -> brokenLinks++            (hash)  <-- canonical distinta => siempre falla (FND-M1)
          previousHash = row.hash
        -> { valid, brokenLinks, checked } (log warn/info)
```

## F6. Listado de auditoría desde el SPA

```
AuditPage (frontend/src/modules/audit/pages/AuditPage.tsx)
   -> useAuditList(params)  (React Query, staleTime 30s)
   -> auditService.list -> GET /api/audit?page&limit&user_id&action&...
        respuesta array (no paginada — FND-M6)
        -> normaliza a { data, total: data.length, page, limit, totalPages: 1 }
   -> tabla + AuditDetailDialog (al seleccionar fila)
```

