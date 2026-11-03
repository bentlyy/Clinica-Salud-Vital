# Migraciones

> Historial de cambios en el esquema de base de datos (**34 migraciones**, 001–032 + 035–036). Sincronizado: 2026-11-02.

## Estrategia

- Schema completo en `db/init.sql`
- Migraciones incrementales en `db/migrations/` aplicadas en orden al arrancar
- Tabla `_migrations` para tracking de migraciones aplicadas
- Runner automático en `src/app.ts` (aplica init.sql si `users` no existe y luego las migraciones pendientes)

## Migraciones Aplicadas

| # | Archivo | Propósito |
|---|---------|-----------|
| 001 | `001_add_specialty_columns.sql` | `icon`, `description`, `department`, `procedures`, `color` en `specialties` |
| 002 | `002_add_lab_type.sql` | `lab_type` en `lab_requests` + rol `lab_technician` + `is_active` en `users` |
| 003 | `003_add_lab_areas.sql` | Tabla `lab_areas` (áreas del laboratorio) |
| 004 | `004_add_lab_samples.sql` | Tabla `lab_samples` (muestras) |
| 005 | `005_add_lab_equipment_reagents_qc.sql` | `lab_equipment`, `lab_reagents`, `lab_qc_records` |
| 006 | `006_add_medical_history.sql` | Tabla `medical_history` |
| 007 | `007_add_reports.sql` | Tabla `reports` |
| 008 | `008_fix_superadmin_tenant_id.sql` | Fix `tenant_id` de superadmin (cross-tenant) |
| 009 | `009_add_jobs_table.sql` | Tabla `jobs` (cola persistente con retry/backoff) |
| 010 | `010_fix_lab_unique_per_tenant.sql` | Constraint único por tenant en catálogos de lab |
| 011 | `011_add_users_gender.sql` | `gender` en `users` |
| 012 | `012_booking_status_history.sql` | Tabla `booking_status_history` |
| 013 | `013_add_user_sessions.sql` | Tabla `user_sessions` (sesiones revocables) |
| 014 | `014_add_waitlist.sql` | Tabla `waitlist` |
| 015 | `015_add_attachments.sql` | Tabla `attachments` |
| 016 | `016_add_clinic_holidays.sql` | Tabla `clinic_holidays` |
| 017 | `017_webhook_subscriptions.sql` | `webhook_subscriptions` + `webhook_deliveries` |
| 018 | `018_add_notifications.sql` | Tabla `notifications` |
| 019 | `019_booking_series.sql` | Tabla `booking_series` (series recurrentes) |
| 020 | `020_register_tenant_guc.sql` | Registra `app.tenant_id` y crea `set_tenant_id()` (`set_config`) para compatibilidad con PgBouncer |
| 021 | `021_fix_rls_for_render.sql` | Fix de políticas RLS para el entorno Render |
| 022 | `022_fix_rls_superadmin_check.sql` | Ajusta política RLS para el superadmin cross-tenant |
| 023 | `023_fix_audit_rls.sql` | Política `audit_write` en `audit_logs` (INSERT permite `'system'`/tenant de sesión; SELECT aislado) |
| 024 | `024_token_family_and_cleanup_indexes.sql` | Familia de tokens + índices de limpieza |
| 025 | `025_create_superadmin_role.sql` | Rol `superadmin` cross-tenant |
| 026 | `026_add_tenant_onboarding.sql` | Tablas `tenant_onboarding` y `onboarding_documents` |
| 027 | `027_performance_indexes.sql` | Índices de rendimiento |
| 028 | `028_lab_analytics_indexes.sql` | Índices de laboratorio/analytics |
| 029 | `029_drop_duplicate_indexes.sql` | Elimina índices duplicados |
| 030 | `030_mercadopago.sql` | Campos Mercado Pago en `plans`, `subscriptions`, `subscription_invoices` |
| 031 | `031_multicurrency.sql` | `currency` y `country_code` en `tenants` |
| 032 | `032_amg_sso.sql` | Soporte de identidad SSO (Core AMG) |
| 035 | `035_rls_saas_isolation_and_audit_user.sql` | Aislamiento RLS de SaaS + usuario de auditoría |
| 036 | `036_rls_tenant_isolation_standard.sql` | Estandariza la política RLS de aislamiento por tenant |

## Schema Inicial

El archivo `db/init.sql` contiene el schema completo con **49 tablas**, índices compuestos, triggers `updated_at` y seguridad RLS FORCE, más seed data (CIE-10, lab tests, specialties, plans).

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

---

Tags: #base-de-datos #migraciones #schema