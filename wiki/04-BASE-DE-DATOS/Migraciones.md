# Migraciones

> Historial de cambios en el esquema de base de datos.

## Estrategia

- Schema inicial completo en `db/init.sql`
- Migraciones incrementales en `db/migrations/`
- Tabla `_migrations` para tracking de migraciones aplicadas

## Migraciones Aplicadas

| # | Archivo | Descripción | Fecha |
|---|---------|-------------|-------|
| 001 | `001_add_specialty_columns.sql` | Agrega icon, description, department, procedures, color a `specialties` | - |
| 002 | `002_add_lab_type.sql` | Agrega `lab_type` a `lab_requests` y `lab_technician` role a `users` | - |

## Schema Inicial

El archivo `db/init.sql` contiene el schema completo con:
- 20+ tablas
- Índices compuestos
- Triggers `updated_at`
- Seed data: CIE-10 (26 códigos), lab tests (9), specialties (12), plans (4)

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
