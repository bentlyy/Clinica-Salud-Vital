# SUB-10 — Flujos

## F1. Notificaciones in-app (listar / contar / marcar)

```
GET /api/notifications?page&limit&is_read        (auth)
   -> resolveScope: superadmin? {allUsers:true, tenantFilter: query.tenant_id}
   -> listNotifications(tenant, user, {page,limit,is_read}, scope)
        WHERE tenant_id=$1 [AND user_id=$2] [AND is_read=$3]
        ORDER BY created_at DESC LIMIT/OFFSET
        + COUNT(*) OVER(clause) -> pagination
   -> {data,total,page,limit,totalPages}

GET /api/notifications/unread-count              (auth)
   -> WHERE tenant_id=$1 [AND user_id=$2] AND is_read=false -> {count}

PATCH /api/notifications/read-all                (auth)
   -> markAllAsRead(user, tenant, scope)
        UPDATE notifications SET is_read=true
        WHERE user_id=$1 AND tenant_id=$2 AND is_read=false
        * ignora scope.allUsers -> superadmin solo marca las suyas  [FND-J?]
   -> {message, count}

PATCH /api/notifications/:id/read                (auth, validateZod params)
   -> markAsRead(id, user, tenant)
        UPDATE notifications SET is_read=true
        WHERE id=$1 AND user_id=$2 AND tenant_id=$3 RETURNING ...
        si 0 filas -> NotFoundError  (ownership usuario+tenant)  [correcto]
```

## F2. Recordatorio por email de citas (cron)

```
cron '*/5 * * * *'  (app.ts:311 startReminderJob)
   |
   v
sendReminders('55 minutes','65 minutes','reminder_1h_sent', ...)   [ventana 1h]
sendReminders('23 hours','25 hours','reminder_24h_sent', ...)      [ventana 24h]
   |
   v
SELECT b.id,b.date,b.time, COALESCE(u.email,b.guest_email) email, ...
FROM bookings b LEFT JOIN users u ON b.user_id=u.id JOIN doctors d ...
WHERE b.<sentField>=FALSE
  AND b.status='pending'
  AND (b.confirmed=TRUE OR b.confirmed=FALSE)     <- tautología (siempre true)
  AND b.tenant_id IS NOT NULL                     <- multi-tenant global
  AND (b.date+b.time) BETWEEN NOW()+<a>min AND NOW()+<b>min
   |
   v (por booking)
needsConfirmation = !booking.confirmed
confirmUrl = token ? FRONTEND_URL/confirm/<token> : null
   |
   v
sendWithRetry(html, 3 intentos, backoff 2^i s)      [sendEmail]
   -> ok: UPDATE bookings SET <sentField>=TRUE WHERE id=$1
   -> error: logger.error, NO marca sentField (reintentará próximo ciclo)
   *
   - Sólo procesa status='pending' (citas ya confirmadas cambiadas a 'confirmed'
     o canceladas no reciben recordatorio).
   - No filtra tenant concreto -> corre para TODOS los tenants.
```

## F3. Verificación de integridad de auditoría (cron cada 6h)

```
cron '0 */6 * * *' (app.ts:517-529) -> verifyAuditChain(tenantId?)
   |
   SELECT id,hash,previous_hash,action,tenant_id FROM audit_logs
     [WHERE tenant_id=$1] ORDER BY created_at ASC, id ASC
   |
   por fila:
     - si previousHash != row.previous_hash -> brokenLinks++ (encadenado)
     - canonical = [prev_hash||'', action, tenant_id||''].join('|')
     - expectedHash = computeHmac(canonical)
     - si expectedHash != row.hash -> brokenLinks++ (hash mismatch)
     - previousHash = row.hash
   -> { valid: brokenLinks===0, brokenLinks, checked }
```

## F4. Alta de notificación de laboratorio (arranque)

```
app.ts:307 -> backfillLabNotifications()   [seed]
   -> createNotification({ tenant_id, user_id, type, title, message, link })
      INSERT INTO notifications(...)
   *
   efecto colateral de arranque: puede crear notificaciones masivas de laboratorio
   (cross-ref SUB-8).
```
