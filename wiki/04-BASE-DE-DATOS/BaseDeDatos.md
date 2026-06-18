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
| Pool | Single instance con `DB_POOL_MAX` configurable |
| Migraciones | SQL manual en `db/migrations/` |

## Ubicación

- Schema inicial: `db/init.sql`
- Migraciones: `db/migrations/001_*.sql`, `002_*.sql`
- Configuración Docker: `docker-compose.yml` (Postgres 15 Alpine)

---

Tags: #base-de-datos #indice
