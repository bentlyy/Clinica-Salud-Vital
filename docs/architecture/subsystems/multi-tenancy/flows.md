# SUB-3 — Flujos

## F1. Aislamiento en una petición autenticada (camino seguro)

```
Cliente ── Authorization: Bearer <JWT> ──▶ Express
   │
   ├─ optionalAuth  → verifica firma → req.user = { id, tenant_id, role }   (auth.middleware)
   │
   ├─ tenantMiddleware:
   │     rawTenantId = req.user.tenant_id || X-Tenant-Id
   │     tenant = tenantService.getById(rawTenantId)   (cache 5m, recarga BD si falta)
   │     req.tenant_id = tenant.id
   │     tenantContext.run(tenant.id, next)            (AsyncLocalStorage)
   │
   ├─ authMiddleware([roles]) → valida token_version + sesión → req.user
   │
   ├─ route → service:
   │     pool.query(...)            (pool envuelto)
   │        └─ arrienda cliente → set_config('app.tenant_id', tenant.id, false)
   │           → ejecuta SQL con RLS → resetea a 'default' → release
   │
   └─ PostgreSQL: policy tenant_isolation USING (tenant_id = current_setting('app.tenant_id'))
        ⇒ sólo filas del tenant activo
```

## F2. Lectura cross-tenant (panel superadmin / jobs / webhooks)

```
Job/webhook/superadmin  (sin request HTTP, sin contexto de tenant)
   └─ superAdminPool.query(...)    (NO envuelto, rol BYPASSRLS)
        ⇒ ve filas de TODOS los tenants
```
Evidencia: `db.ts:101,165-185`; uso `saas.service.ts:287,594`.

## F3. Resolución de tenant cuando falta (fallback)

```
rawTenantId ausente
   ├─ NODE_ENV=production AND !isPublicPath → 400 X-Tenant-Id required
   └─ si no                                   → req.tenant_id = DEFAULT_TENANT_ID || 'default'
                                                 tenantContext.run('default', next)
```
Evidencia: `tenant.middleware.ts:52-61`.
`DEFAULT_TENANT_ID='default'` ⇒ **fail-open a la clínica "default"** (ver FND-B2/B3).

## F4. Autorización por feature de plan

```
route con requireFeature('laboratory')
   └─ checkFeatureAccess('laboratory', req.tenant_id)
        ├─ tenant_features.enabled (override)          ┐
        ├─ plans.features->>'laboratory' (por suscripción) ├─ COALESCE → false
        └─ default 'false'                              ┘
      false → 403 "requiere plan superior"
```
Evidencia: `feature.middleware.ts:5-13`, `saas.service.ts:389-401`.

## F5. Autorización por relación médico-paciente (BOLA)

```
doctor solicita PHI de paciente
   └─ assertDoctorPatientRelationship(doctorId, patientUserId, tenantId)
        └─ doesDoctorHaveAnyRelationship:
             clinical_records (doctor_id, patient_id, tenant_id) UNION
             bookings        (doctor_id, user_id,   tenant_id)
        sin registro → ForbiddenError (fail-closed)
```
Evidencia: `ownership.ts:17-58`.

## F6. Alta de tenant (onboarding) y refresco de cache

```
POST /api/saas/onboard (público)
   └─ onboardTenant()  (superAdminPool, BEGIN)
        INSERT tenants + users(admin, role=admin) + [subscription + invoice]
        + onboarding (+ documentos)
        COMMIT
        └─ tenantService.loadFromDB()   → refresca el cache de tenants
```
Evidencia: `saas.service.ts:449-580`, `561`.
