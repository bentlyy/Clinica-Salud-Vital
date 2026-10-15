# SUB-15 — Flujos

## F1. Ciclo de vida de una query tenant-aware

```
Request HTTP
  -> tenant.middleware: tenantContext.run(tenantId, next)     [SUB-3]
  -> service: pool.query(text, values)
       tagTenantAwarePool.scopedQuery:
         1) client = rawConnect()                              (pool: max 15)
         2) set_config('app.tenant_id', ctx || 'default', false)
         3) client.query(text, values)   <- RLS usa app.tenant_id
         4) set_config('app.tenant_id', 'default', false)      (reset)
         5) client.release()
```

> Cada `query()` = **3 round-trips** al motor. `pool.on('connect')` fija `'default'` al crear el cliente.

## F2. Transacción multi-statement

```
service: const client = await pool.connect()   // wrapped -> fija app.tenant_id
   BEGIN
   ... sentencias ...
   COMMIT / ROLLBACK
   client.release()
```

> El wrapper de `connect()` garantiza que `BEGIN/COMMIT` corran bajo el mismo `app.tenant_id`.

## F3. Aislamiento por RLS (recordatorio, ver SUB-3)

```
app.tenant_id (GUC) --usado por policy--> USING (tenant_id = COALESCE(current_setting('app.tenant_id', true), 'default'))
   - pool tier-aware: clinic_app (RLS on)
   - superAdminPool: clinic_superadmin (BYPASSRLS)  -> panel cross-tenant
```

## F4. Bootstrap de esquema

```
psql -f db/init.sql         (49 tablas, índices, triggers, seeds CIE-10/lab/specialties/planes)
psql -f db/security.sql     (roles clinic_app/clinic_superadmin, RLS, auditoría)
migraciones 001..031        (evolución idempotente; registradas en _migrations)
psql -f db/optimize.sql     (manual, post-seed: VACUUM ANALYZE + EXPLAIN)
```

## F5. Trabajo background (jobs)

```
scheduler/worker -> SELECT ... FROM jobs WHERE status='pending' ...
   (sin request => sin tenantContext => RLS cae a 'default')
```

> `jobs` **no tiene `tenant_id`**; el tenant debe viajar en `data` JSONB y fijarse manualmente (no ocurre hoy).
