# SUB-18 — Módulos

## Backend

| ID | Unidad | Archivo | Responsabilidad |
|---|---|---|---|
| SUB18-U1 | `seed()` | `src/seed/seed.ts:109` | Datos clínicos completos del tenant `default` (users/doctores/pacientes/citas/historia/medicación). Gate `SEED_ON_STARTUP` |
| SUB18-U2 | backfills | `src/seed/seed.ts:1065,1115,1188,1281,1439` | `backfillMedicalHistory`, `backfillLabRequests`, `backfillLabNotifications`, `backfillInvoices`, `backfillUser1Data` |
| SUB18-U3 | `seedDefaultTenant`/`seedSuperAdmin` | `src/seed/admin.seed.ts:159,200` | Tenant `default` + superadmin (credenciales por env) |
| SUB18-U4 | `seedAdmin` | `src/seed/admin.seed.ts:236` | Admin de clínica |
| SUB18-U5 | `seedTestTenants` | `src/seed/admin.seed.ts:352` | Tenants de prueba completos (doctores, pacientes, lab pro, facturas, auditoría) por transacción RLS |
| SUB18-U6 | `spreadSeedDates` | `src/seed/admin.seed.ts:1133` | Dispersa `created_at` de users/bookings/clinical_records (solo non-prod) |
| SUB18-U7 | `deriveSeedPassword` | `src/seed/seed-credentials.ts:20` | Regla de contraseña derivada de seed |

## Superficie

- **Sin endpoints.** Invocado exclusivamente desde `app.ts` post-boot (`:457-509`).
- Constantes exportadas: `DEMO_TENANT_ID='clinica-demo'`, `DEMO_ADMIN_EMAIL='admin@demo.clinic.com'`, `DEMO_ADMIN_PASSWORD='DemoVitaria2026!'` (consumidas por `auth.service`).

## Observaciones de módulo

- `seed()` corre sobre `pool` global (sin transacción); `seedTestTenants` sí abre transacción + `set_config('app.tenant_id')`.
- `ensureDoctorsExist` se re-ejecuta en cada arranque (idempotente por `ON CONFLICT`).
- Múltiples `catch {}` vacíos que silencian fallos de inserción.
- `seedDefaultTenant`/`seed()` hacen DDL (índices, columnas, constraints) al arrancar.
