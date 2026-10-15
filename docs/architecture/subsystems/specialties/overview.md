# SUB-17 — Especialidades y catálogos

> **Estado:** AS-IS completado · **Certeza global:** confirmado (código + SQL). Efecto en prod NO VERIFICADO.
> **Evidencia principal:** `src/modules/specialties/*`, `src/modules/currencies/*`, `src/shared/currencies.ts`, `db/init.sql` (tabla `specialties`), `db/migrations/001_add_specialty_columns.sql`, `src/middlewares/tenant.middleware.ts`, `src/app.ts` (montaje).
> **Nota:** agrupa el catálogo de especialidades (CRUD tenant) y el catálogo de monedas/tasas (público).

## 1. Propósito

- **Especialidades:** catálogo por tenant con icono, descripción, departamento, procedimientos, color y profesionales asociados; usado por la agenda, el alta de doctores (`ensureSpecialty`) y el SPA.
- **Monedas:** conversión de precios USD→moneda local para la landing y el billing; tasas obtenidas en vivo con caché/fallback.

## 2. Componentes

| Módulo | Rol |
|---|---|
| `specialties.routes/controller/service` | CRUD de especialidades (lectura pública; escritura admin/superadmin) |
| `currencies.routes/controller` | `GET /rates` (público) |
| `shared/currencies.ts` | `SUPPORTED_COUNTRIES`, `getRates`, `refreshRates`, `convertFromUsd`, helpers de país/divisa |

## 3. Superficie HTTP

| Prefijo | Endpoint | Auth |
|---|---|---|
| `/api/specialties` (`app.ts:279`) | `GET /` | **público** (`PUBLIC_PATH`) |
| | `GET /:id` | **público** |
| | `POST /` | authMiddleware + `authorize('admin','superadmin')` |
| | `PUT /:id` | authMiddleware + `authorize('admin','superadmin')` |
| | `DELETE /:id` | authMiddleware + `authorize('admin','superadmin')` |
| `/api/currencies` (`app.ts:281`) | `GET /rates` | **público** |

## 4. Reglas de negocio (AS-IS)

- **Create idempotente:** `createSpecialty` hace "get-or-create" por `(tenant_id, name)` (UNIQUE en BD): un POST duplicado devuelve la existente (no 409).
- **`ensureSpecialty`:** usado por `doctor.service` (`:66,155`) para crear la especialidad si no existe al dar de alta/actualizar un doctor.
- **Agrupación de doctores:** `getAllSpecialties` asocia doctores por `tenant_id:specialty` comparando `doctors.specialty` con `specialties.name` (exacto).
- **Monedas:** `SUPPORTED_COUNTRIES` (CL, AR, BR, MX, US). `refreshRates` consulta `open.er-api.com/v6/latest/USD` (timeout 8s) al boot y por cron; fallback hardcodeado si falla.

## 5. Multi-tenancy / acceso

- El `tenantMiddleware` resuelve el tenant como `req.user.tenant_id || req.headers['x-tenant-id']`; para rutas públicas acepta el header sin autenticación.
- Los endpoints públicos de especialidades devuelven el catálogo del tenant resuelto **incluyendo nombre y email de los doctores** (ver FND-O1).

## 6. Almacenamiento

- `specialties` (`db/init.sql:404-416`): `name`, `icon`, `description`, `department`, `procedures JSONB`, `color`, `tenant_id` con `UNIQUE (tenant_id, name)`. Columnas extendidas añadidas en `001` (con backfill de iconos/descripciones/procedimientos).

## 7. NO VERIFICADO

- Si la landing realmente consume `/api/currencies/rates` y `/api/specialties` (public).
- Frescura real de las tasas en producción (fuente externa `open.er-api.com`).
- Si algún tenant depende del color/icono sembrado por la migración `001`.
