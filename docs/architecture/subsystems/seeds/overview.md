# SUB-18 — Semillas y arranque de datos

> **Estado:** AS-IS completado · **Certeza global:** confirmado (código). Efecto en prod NO VERIFICADO.
> **Evidencia principal:** `src/seed/seed.ts` (1636L), `src/seed/admin.seed.ts` (1179L), `src/seed/seed-credentials.ts` (20L), `src/app.ts` (post-boot `:457-509`).

## 1. Propósito

Poblar la base con datos de demostración/dev (tenant `default`, tenants de prueba, doctores, pacientes, citas, historia clínica, laboratorio, facturas, auditoría) y ejecutar *backfills* idempotentes al arranque. Es el único camino que crea el **admin** y el **superadmin** iniciales.

## 2. Componentes

| Archivo | Rol |
|---|---|
| `seed.ts` | `seed()` (datos clínicos del tenant `default`) + backfills (`backfillMedicalHistory`, `backfillLabRequests`, `backfillLabNotifications`, `backfillInvoices`, `backfillUser1Data`) |
| `admin.seed.ts` | `seedDefaultTenant`, `seedSuperAdmin`, `seedAdmin`, `seedTestTenants`, `spreadSeedDates`; constantes `DEMO_TENANT_ID`, `DEMO_ADMIN_EMAIL`, `DEMO_ADMIN_PASSWORD` |
| `seed-credentials.ts` | `deriveSeedPassword(email)` → `Vitaria.<slug>.<año>!` |

## 3. Orquestación al arranque (`app.ts`)

```
registerWorkers() -> startQueueProcessor() -> tenantService.loadFromDB() -> set_tenant_id('default')
seedsEnabled = NODE_ENV !== 'production' || RUN_SEEDS === 'true'
if (seedsEnabled):
  seedDefaultTenant()  (try/catch none-fatal)
  seedSuperAdmin()     (try/catch none-fatal)
  seedTestTenants()    (try/catch none-fatal)
  seed()               (try/catch none-fatal)
  backfillInvoices/MedicalHistory/LabRequests/LabNotifications/User1Data()
  spreadSeedDates()  -> markSeedComplete()
else: markSeedComplete()   (log: seeds de demo deshabilitados)
startReminderJob(); refreshRates(); cron(6h refreshRates; 6h verifyAuditChain; 03:00 cleanup)
```

Además `seed()` tiene su propio gate interno `SEED_ON_STARTUP` (default: ON en dev/test, OFF en prod salvo `SEED_ON_STARTUP=true`).

## 4. Reglas / credenciales

- **Admin** del tenant `default`: `ADMIN_PASSWORD` (obligatoria en prod; si falta en dev usa `'REPLACED_PASSWORD'`).
- **Superadmin**: `SUPERADMIN_PASSWORD` (constante `seedSuperAdmin`).
- **Demás usuarios seed**: `deriveSeedPassword(email)` = `Vitaria.<local-part>.<año actual>!` (regla pública y determinista).
- **Admin demo**: `DEMO_ADMIN_PASSWORD = 'DemoVitaria2026!'` **hardcodeado** en `admin.seed.ts:13`.
- Idempotencia: `ON CONFLICT (tenant_id,email)` en users/doctors; `ON CONFLICT DO NOTHING` en catálogos; bookings sólo en primer run (`bookingCount === 0`).

## 5. DDL en runtime (efecto lateral)

`seed.ts` ejecuta al arrancar:
- `CREATE UNIQUE INDEX IF NOT EXISTS idx_users_tenant_email`
- `ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS token_version`
- `CREATE UNIQUE INDEX IF NOT EXISTS idx_doctors_tenant_email`
- `ALTER TABLE bookings DROP CONSTRAINT IF EXISTS check_future_date` … `ADD CONSTRAINT ... NOT VALID` (y de nuevo en `spreadSeedDates`).

## 6. NO VERIFICADO

- Si `RUN_SEEDS`/`SEED_ON_STARTUP` están activados en algún entorno real.
- Presencia de `ADMIN_PASSWORD`/`SUPERADMIN_PASSWORD` en prod (cross-ref L1).
- Si los tenants de prueba existen en prod.
