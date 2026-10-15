# SUB-17 — Flujos

## F1. Listado público de especialidades (con doctores)

```
GET /api/specialties   (sin auth — PUBLIC_PATH)   [app.ts:279]
  -> tenantMiddleware: req.tenant_id = req.user?.tenant_id || header['x-tenant-id'] || DEFAULT
  -> getSpecialties -> getAllSpecialties(req.tenant_id, { crossTenant: isSuperAdmin })
       db = crossTenant ? superAdminPool : pool
       SELECT specialties [WHERE tenant_id=$1] ORDER BY name
       SELECT id,name,email,specialty,tenant_id FROM doctors [WHERE tenant_id=$1]
       agrupa doctores por `${tenant_id}:${specialty}`
  -> res.json([...specialties con doctors[] (name+email)])   <-- PII pública (FND-O1)
```

## F2. Alta/edición de especialidad (admin/superadmin)

```
POST /api/specialties  (authMiddleware + authorize('admin','superadmin') + validateZod(specialtySchema))
  -> resolveRequiredTenant: superadmin -> body.tenant_id || req.tenant_id ; admin -> req.tenant_id
  -> runInTenantScope: si superadmin opera otro tenant -> tenantContext.run(tenantId, fn)
  -> createSpecialty(name, desc, tenantId, {icon,department,color,procedures})
       si existe (name,tenant_id) -> devuelve existente (idempotente)   [FND-O5]
       INSERT specialties(...) RETURNING ...
  -> 201 { specialty }
```

## F3. Auto-creación de especialidad al dar de alta un doctor

```
doctor.service (register/update)  [doctor.service.ts:66,155]
  -> ensureSpecialty(name, tenantId='default')
       si no existe (name,tenant_id) -> INSERT specialties(name, tenant_id)  (resto por defaults)
```

## F4. Tasas de cambio (público)

```
GET /api/currencies/rates   (sin auth)   [app.ts:281]
  -> currencies.controller.getExchangeRates -> getRates()
       { base:'USD', rates:{USD,CLP,ARS,BRL,MXN}, updatedAt }
  * rates proviene de caché; refresco al boot y cron 6h:
    app.ts:512 -> refreshRates() -> fetch open.er-api.com/v6/latest/USD (8s timeout)
       éxito -> pickSupported(data.rates) ; fallo -> mantiene FALLBACK_RATES   [FND-H12]
```

## F5. Conversión de precios (billing)

```
convertFromUsd(usdAmount, currency, rates?)
  rate = (rates?.[currency]) || cachedRates[currency] || 1     <-- fallback silencioso a 1:1
  raw = usdAmount * rate ; decimals = getDecimals(currency)
  return round(raw * 10^decimals) / 10^decimals
```
