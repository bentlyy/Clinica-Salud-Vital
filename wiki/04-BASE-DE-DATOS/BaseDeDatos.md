# Base de Datos

> Documentación del modelo de datos PostgreSQL 15.

## Páginas

| Página | Descripción |
|--------|-------------|
| [[04-BASE-DE-DATOS/Modelo-de-Datos\|Modelo de Datos]] | Diagrama y relaciones entre tablas |
| [[04-BASE-DE-DATOS/Entidades\|Entidades]] | Descripción detallada de cada tabla |
| [[04-BASE-DE-DATOS/Migraciones\|Migraciones]] | Historial de migraciones |

## Stack de Base de Datos

| Componente | Detalle |
|------------|---------|
| Motor | PostgreSQL 15 |
| Driver | `pg` (raw SQL, sin ORM) |
| Pool | Single instance con `DB_POOL_MAX` (default 25) + `readPool` opcional |
| SSL | Dinámico: interno (local/compose) vs externo (Render, `DB_CA_CERT`) |
| Multi-tenancy | **Shared DB** con RLS FORCE por sesión (`GUC app.tenant_id`) |
| Migraciones | SQL en `db/migrations/` (23) + tracking `_migrations` |
| Tablas | **47** (en `db/init.sql`) |

## Ubicación

- Schema inicial completo: `db/init.sql` (47 tablas)
- Migraciones: `db/migrations/001_*.sql` … `023_*.sql`
- Configuración Docker: `docker-compose.yml` (Postgres 15 Alpine)

## Multi-tenancy (RLS)

- Toda tabla lleva `tenant_id TEXT NOT NULL`
- Al iniciar sesión, el backend ejecuta `set_tenant_id(<tenant_id>)` que setea `app.tenant_id`
- **RLS FORCE** (`FORCE ROW LEVEL SECURITY`) en 47 tablas: aplica política incluso al owner
- Política única por tabla: `tenant_id = current_setting('app.tenant_id', true)`
- Parches: `020_register_tenant_guc.sql` (el GUC se registra al conectar para que `current_setting` no falle), `021_fix_rls_for_render.sql`, `022_fix_rls_superadmin_check.sql`, `023_fix_audit_rls.sql`
- `audit_logs` con `FORCE RLS` mantiene **SELECT aislado** por `tenant_isolation`, pero acepta **INSERT** de filas con `tenant_id = 'system'` o el tenant de sesión (política `audit_write` del parche `023_fix_audit_rls.sql`) para que los triggers SECURITY DEFINER no fallen; la integridad se protege con la cadena HMAC (verifica cada 6 h)

## Entidades Principales

| Área | Tablas |
|------|--------|
| Multi-tenant | `tenants`, `plans`, `subscriptions`, `subscription_invoices`, `tenant_features`, `tenant_usage` |
| Usuarios | `users`, `doctors`, `user_sessions`, `refresh_tokens`, `password_reset_tokens` |
| Agenda | `doctors`, `doctor_availability`, `doctor_exceptions`, `bookings`, `booking_series`, `booking_status_history`, `waitlist`, `clinic_holidays` |
| Clínico | `clinical_records`, `prescriptions`, `cie10_catalog`, `medical_history`, `clinical_templates` |
| Laboratorio | `lab_areas`, `lab_tests`, `lab_requests`, `lab_request_items`, `lab_samples`, `lab_qc_records`, `lab_equipment`, `lab_reagents`, `lab_notifications`, `lab_result_history` |
| Facturación | `invoices`, `invoice_items`, `payments`, `insurance_claims` |
| Sistema | `audit_logs`, `notifications`, `attachments`, `reports`, `jobs`, `webhook_subscriptions`, `webhook_deliveries`, `ml_demand_forecast`, `_migrations` |

## Convenciones

| Convención | Estándar |
|-------------|----------|
| Nombres tablas | `snake_case` plural |
| Nombres columnas | `snake_case` |
| Primary keys | `id SERIAL PRIMARY KEY` |
| Foreign keys | `fk_tabla_columna` |
| Índices | `idx_tabla_columnas` |
| Timestamps | `created_at`, `updated_at` |
| Soft delete | `deleted_at`, `deleted_by` |
| Multi-tenant | `tenant_id TEXT NOT NULL` en toda tabla |
| Seguridad | CHECK constraints, `audit_logs` con HMAC encadenado |

---

Tags: #base-de-datos #indice