# SUB-18 — Flujos

## F1. Arranque con seeds habilitados

```
app.ts post-boot
  registerWorkers() -> startQueueProcessor() -> tenantService.loadFromDB() -> set_tenant_id('default')
  seedsEnabled = NODE_ENV !== 'production' || RUN_SEEDS === 'true'
  [si seedsEnabled]
    seedDefaultTenant()   -> tenant 'default' + plan
    seedSuperAdmin()      -> superadmin (SUPERADMIN_PASSWORD)
    seedTestTenants()     -> por cada tenant de prueba: transacción + set_config(tenant) [tests]
    seed()                -> gate SEED_ON_STARTUP
         crea índices/columna token_version/constraint bookings (DDL)
         si admin@clinic.com ya existe -> ensureDoctorsExist() y return
         si no -> admin + pacientes + doctores + availability + citas(>100)
                  + historia clínica + prescripciones + lab + auditoría
    backfillInvoices/MedicalHistory/LabRequests/LabNotifications/User1Data()
    spreadSeedDates()     -> desplaza created_at (non-prod)
    markSeedComplete()
  crones: reminder | rates 6h | verifyAuditChain 6h | cleanup 03:00
```

## F2. Credenciales de seed

```
deriveSeedPassword('juan@clinic.com')  -> 'Vitaria.juan.<añoActual>!'
admin@clinic.com     -> ADMIN_PASSWORD (env; dev fallback 'REPLACED_PASSWORD')
superadmin           -> SUPERADMIN_PASSWORD (env)
admin@demo.clinic.com-> 'DemoVitaria2026!' (hardcodeado)   <-- FND-P1
```

## F3. `seed()` idempotente (reruns)

```
seed():
  ensure idx_users_tenant_email, token_version, idx_doctors_tenant_email
  seedOnStartup? (SEED_ON_STARTUP)
    admin exists?  SÍ -> ensureDoctorsExist(); return   (no duplica citas)
                   NO -> seed completo (first run)
```

## F4. `seedTestTenants` (uno de los tenants de prueba)

```
ensureTenant(t):
  existe tenants.id? SÍ -> continuar
  autoCreate? NO -> skip ; SÍ -> superAdminPool INSERT tenants + subscriptions
client.BEGIN(); set_config('app.tenant_id', t.id)
  subscriptions | admin user | 5 doctores(+availability,exceptions) | pacientes
  | compartido@clinic.com | lab technician | specialties | lab areas/tests/equipment/reagents/qc
  | bookings(pasadas+futuras) | clinical_records | prescriptions | lab_requests/items
  | lab_notifications | invoices | subscription_invoices | audit_logs | medical_history
COMMIT (ROLLBACK si error)
```
