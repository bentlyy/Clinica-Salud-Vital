# SUB-15 — Base de datos y acceso a datos

> **Estado:** descripción AS-IS completada · **Certeza global:** confirmado (lectura de código y SQL).
> **Evidencia principal:** `db/init.sql` (1198 L), `db/security.sql` (357 L), `db/migrations/001–031`, `db/optimize.sql`, `db/postgresql.conf`, `src/shared/db.ts`, `src/shared/multi-tenant.service.ts`.

## 1. Propósito

Motor **PostgreSQL 15** con acceso **SQL directo** vía `pg` (**sin ORM**). Este subsistema documenta el **esquema** (49 tablas), el **modelo de acceso** (3 pools + `AsyncLocalStorage` + wrapper tenant-aware), los **índices/triggers**, las **migraciones** y los patrones de consulta/transacción.

## 2. Motor, conexiones y pools

`src/shared/db.ts` define **tres pools**:

| Pool | Rol | SSL | Max | Especial |
|---|---|---|---|---|
| `pool` | app (`clinic_app`, sujeto a RLS) | según entorno | `DB_POOL_MAX` (15) | envuelto con `tagTenantAwarePool` |
| `readPool` | lectura (`DATABASE_URL_READ_ONLY`), fallback → `pool` | ídem | `max(poolMax/2,5)` | envuelto; `statement_timeout` 60 s |
| `superAdminPool` | `clinic_superadmin` (`BYPASSRLS`), fallback → `pool` | ídem | `max(poolMax/4,2)` | **no** envuelto |

- **SSL/CA:** `useSSL = !isInternalDb()`; valida `DB_CA_CERT` (PEM) y `DB_SSL_REJECT_UNAUTHORIZED`; `checkServerIdentity: () => undefined` cuando hay CA.
- **Timeouts:** `statement_timeout`/`query_timeout` 30 s; `idle_in_transaction_session_timeout` 60 s.
- **Tenant-aware:** `tagTenantAwarePool` reescribe `connect()` y `query()` para fijar `app.tenant_id` (vía `set_config(..., false)`, session-scoped) desde `tenantContext` (AsyncLocalStorage), y **lo resetea a `default` antes de `release()`**. Cada `query()` hace **3 viajes** (set_config + query + reset).
- `pool.on('connect')` fija `app.tenant_id='default'` al nacer el cliente.
- `tenantContext` (ALS) se puebla en `tenant.middleware.ts` por request.

## 3. Inventario de esquema (49 tablas)

| Familia | Tablas |
|---|---|
| Núcleo | `tenants`, `users`, `doctors`, `bookings`, `doctor_availability`, `doctor_exceptions` |
| Clínica/PHI | `clinical_records`, `prescriptions`, `cie10_catalog`, `clinical_templates`, `medical_history` |
| Laboratorio | `lab_areas`, `lab_tests`, `lab_requests`, `lab_request_items`, `lab_samples`, `lab_qc_records`, `lab_equipment`, `lab_reagents`, `lab_notifications`, `lab_result_history` |
| Auth/sesiones | `refresh_tokens`, `password_reset_tokens`, `user_sessions` |
| Billing | `invoices`, `invoice_items`, `payments`, `insurance_claims` |
| SaaS | `specialties`, `plans`, `subscriptions`, `subscription_invoices`, `tenant_features`, `tenant_usage`, `tenant_onboarding`, `onboarding_documents` |
| Operación | `notifications`, `waitlist`, `clinic_holidays`, `booking_series`, `booking_status_history`, `attachments`, `reports`, `webhook_subscriptions`, `webhook_deliveries`, `jobs` |
| Auditoría | `audit_logs` |
| ML | `ml_demand_forecast` |
| Sistema | `_migrations` |

- **`tenant_id`:** casi todas las tablas lo tienen como `TEXT NOT NULL DEFAULT 'default'`; excepciones notables: `users.tenant_id TEXT DEFAULT 'default'` (**sin NOT NULL**), `jobs` (**sin `tenant_id`**), `_migrations`.
- **RLS:** cobertura en `db/security.sql` + migraciones 021/022/023 (ver `[[../multi-tenancy/overview]]`, FND-B1…B8). Excepciones/fugas conocidas: FND-B1, FND-B4.

## 4. Índices, triggers, constraints

- **138 `CREATE INDEX`** en init.sql + migraciones, muy orientados a `(tenant_id, …)`; migraciones 027/028 añaden performance/analytics; **029 elimina 4 índices duplicados exactos** (booking_series, clinic_holidays, notifications, webhook_subscriptions).
- **Triggers `updated_at`:** función `update_updated_at_column()` + 14 triggers `BEFORE UPDATE` (users, clinical_records, invoices, insurance_claims, lab_requests, lab_tests, tenants, plans, subscriptions, lab_areas, medical_history, webhook_subscriptions, lab_samples, lab_equipment, lab_reagents). Varias tablas con `updated_at` **no** tienen trigger (p. ej. `doctor_availability`, `lab_notifications`).
- **Auditoría:** triggers en `audit_logs` (ver SUB-3, FND-B6).
- **Constraints destacables:** `bookings.unique_booking (doctor_id,date,time)`, `check_guest_or_user`, `check_future_date CHECK (date >= CURRENT_DATE - INTERVAL '1 day')` (no inmutable), checks de enum en `status`.

## 5. Migraciones

31 migraciones, registradas en `_migrations`. Rango funcional: 001–005 lab base, 006 medical_history, 007 reports, 008 fix superadmin tenant, 009 jobs, 010 lab unique/tenant, 011 gender, 012 booking_status_history, 013 user_sessions, 014 waitlist, 015 attachments, 016 holidays, 017 webhooks, 018 notifications, 019 booking_series, 020 register GUC, **021–023 RLS Render/audit**, 024 token_family + cleanup indexes, 025 superadmin role, 026 tenant_onboarding, 027/028 indexes, 029 dedup indexes, 030 mercadopago, 031 multicurrency.

> **Nota:** `db/init.sql` se declara como *"Single source of truth (sin migrations)"* pero varias tablas (clinical_templates, tenant_onboarding, onboarding_documents, lab_*, etc.) se **redefinen** también en migraciones con `IF NOT EXISTS` → doble fuente (FND-G1).

## 6. Findings de SUB-15 (ver `05-findings.md`, FND-G1…G10)

Destacan: **G1** doble fuente de esquema, **G2** `DEFAULT 'default'` masivo + `users.tenant_id` nullable, **G3** FKs ausentes, **G4** `jobs` sin tenant, **G9** overhead de 3 viajes por query.

## 7. Notas de NO VERIFICADO

- Estado real de RLS/roles en producción (Render) y si `clinic_superadmin` existe (migración 025 tolerante a fallo).
- `DATABASE_URL_READ_ONLY`/`DATABASE_URL_SUPERADMIN` configuradas (si no, hay fallback silencioso a `pool`).
- `pg_stat_statements` y parámetros efectivos en el servidor gestionado (el `postgresql.conf` es para VM propia, no Render).
- Volumen real de datos e índices usados (`optimize.sql` es un script manual post-seed).
