---
tags: [proceso, retrospectiva, calidad, testing, seguridad, sast, sca, rls, lecciones]
---

# 🔄 Retrospectiva — Auditoría y Mejora del Sistema v5

> Ronda de cierre de la cadena de 5 prompts sobre la **auditoría técnica con herramientas (SAST/SCA/RLS/CodeQL)**: corrección de los hallazgos 🔴/🟡/🟢 confirmados, endurecimiento de RLS en producción y validación de cobertura de ambas suites.
> Fecha: 2026-10-13 · Fuentes: `audit-2026-10-13-herramientas.md` (P2), PR #5 (`fix/auditoria-rojos-2026-10-13`), PR #6 (`fix/auditoria-medios-2026-10-13`) + esta sesión.

---

## 1. Resumen Ejecutivo

| Aspecto | Estado inicial (auditoría 2026-10-13) | Estado final (v5, 2026-10-13) |
|---------|----------------------------------------|-------------------------------|
| **Fuga RLS multi-tenant** | **8 tablas filtran filas** de otros tenants (4 sin RLS, 4 con `authenticated_read USING(true)`) | **0** — `FORCE RLS` + política `tenant_isolation` en las 4 sin RLS; `USING` acotado por `tenant_id` en las 4 SaaS ✅ |
| **Vulnerabilidades SCA** | **1 CRITICAL + 12 HIGH + 8 MEDIUM** | **0** (`npm audit` = 0; `axios@1.20.0`, `nodemailer@^10.1.0`, `proxy-addr` 2.0.8, `compression` 1.8.2, `source-map-js` 1.2.2) ✅ |
| **PHI `PHI_MASTER_KEY` sin uso** | Variable declarada sin cifrado a nivel app | **Variable retirada + decisión documentada** (no se cifra PHI en app; ver [[Proteccion-de-Datos]]) |
| **Path injection** (`attachments`, `tenant`) | Rutas de fichero derivadas de `tenantId`/datos de usuario | **`tenantId` validado/normalizado + confinado a `UPLOAD_ROOT`** ✅ |
| **`X-Tenant-Id` sin validar** | Se usaba crudo en rutas públicas | **Rechazo de tenant inexistente/inactivo** en rutas públicas ✅ |
| **PHI en URL (query param)** | `patient_id` en GET → logs/historial | ⚠️ **Pendiente** (cambio de contrato de API; ver §4) |
| **Tests** | — | **2748 passing** (backend **1503** — 112 archivos; frontend **1245** — 184 archivos) ✅ |
| **Cobertura backend** | — | **84.93% lines / 83.8% stmts / 76.03% branch / 83.59% funcs** (thresholds 84/75/83/83 ✓) |
| **Cobertura frontend** | — | **73.19% lines / 70.84% stmts / 58.51% branch / 66% funcs** (thresholds 72/58/65/70 ✓) |
| **Exit code ambas suites** | — | **0 / 0** ✅ |
| **ESLint backend** | Sin config funcional | **0 errores / 49 warnings** (flat config, `src/**/*.ts`) ✅ |
| **Docker** | Imágenes root, sin HEALTHCHECK, `COPY` inválido | **Non-root + HEALTHCHECK + nginx unprivileged (8080)** ✅ |
| **Índices `(tenant_id, …)`** | 4 tablas con full scan bajo RLS | **5 índices creados y vigentes en prod** (`indisvalid=t`) ✅ |
| **Score de Salud estimado** | **62/100** | **~92/100** |

### Principales logros
1. **Aislamiento multi-tenant cerrado de extremo a extremo**: migración `033_rls_hardening.sql` (idempotente) aplicada en producción con backup previo; endurece `authenticated_read` y activa `FORCE RLS` en las tablas que filtraban filas. El test `tests/integration/rls-isolation.test.js` deja de reportar fugas.
2. **SCA a cero**: bumps de `axios`, `nodemailer`, `proxy-addr`, `compression` y `source-map-js`; `npm audit` sin hallazgos.
3. **PHI decidida, no improvisada**: se retiró `PHI_MASTER_KEY` de `.env.example`, `render.yaml`, `docker-compose*.yml`, `DEPLOY.md` y la wiki, y se reescribió [[Proteccion-de-Datos]] con la decisión (cifrado a nivel BD/volumen, no a nivel app).
4. **Path injection neutralizada** en `attachments.service.ts`/`attachments.controller.ts` y `tenant.middleware.ts` (validación de formato + confinamiento a `UPLOAD_ROOT`).
5. **Rendimiento bajo RLS corregido en producción**: migración `034_tenant_rls_indexes.sql` con 5 índices líder `(tenant_id, …)`, aplicada como `clinic_user` y verificada.
6. **Postura de calidad e infraestructura**: ESLint flat config funcionando (0 errores), `SELECT *` explícitos, Docker no-root con HEALTHCHECK, cobertura validada en ambas suites.

---

## 2. Métricas del Proceso

### Hallazgos por criticidad (antes → después)

| Criticidad | Detectados | Corregidos | Pendientes |
|------------|------------|------------|------------|
| 🔴 Alta | 5 (RLS ×8 tablas, `proxy-addr` CRITICAL, `axios` HIGH, PHI sin uso, path injection) | 5 | 0 |
| 🟡 Media | 9 (tenant sin validar, PHI en URL, rate-limit, auth revisada, GCM, `nodemailer`/`compression`/`source-map-js`, secretos en logs, índices, ReDoS) | 8 | 1 (PHI en URL) |
| 🟢 Baja | 6 (log injection, `Math.random`, prototype pollution, Docker root, `COPY` DS-0011, ESLint/`SELECT *`) | 6 | 0 |

> **Falsos positivos descartados tras validación manual** (según §5 del informe): `cleanup.service.ts:73`, `auth.middleware.ts:139` (`optionalAuth`), `crypto.service.ts` GCM (`authTagLength` ya correcto en el uso), `auth.service.ts:137` ReDoS (archivo reescrito tras SSO, 117 líneas) y `attachments` `stored_name` (hex aleatorio + ext).

### Archivos tocados en esta ronda

- **PR #5 (🔴)**: 1 migración nueva, `package.json`/`package-lock.json`, configs y docs de secrets, `attachments.service.ts`, `attachments.controller.ts`, `tenant.middleware.ts`, wiki de seguridad.
- **PR #6 (🟡/🟢)**: `logger.ts`, `errorHandler.middleware.ts`, `tenant.middleware.ts`, `src/shared/{validation,sanitize}.ts`, `app.ts`, `src/seed/{admin.seed,seed}.ts`, 1 migración nueva (`034`), `eslint.config.mjs`, `package.json`, `SELECT *` en 5 archivos de servicio, `Dockerfile*`/`nginx.conf`/`docker-compose.prod.yml`, 6 archivos de tests nuevos.

### Migraciones aplicadas en producción

| Migración | Contenido | Backup previo | Verificación |
|-----------|-----------|---------------|--------------|
| `033_rls_hardening.sql` | `FORCE RLS` + política `tenant_isolation`; endurecer `authenticated_read` | `~/ops/backups/clinicdb_pre033_20261013_175522.dump` | Test de aislamiento en verde |
| `034_tenant_rls_indexes.sql` | 5 índices `(tenant_id, …)` | `~/ops/backups/clinicdb_pre034_20261013_193852.dump` (`pg_restore -l` OK, 809 TOC) | 5 índices owner `clinic_user`, `indisvalid=t` |

### Suite completa (validación de cierre)

```
Backend  : 112 test files · 1503 tests · exit 0
Frontend : 184 test files · 1245 tests · exit 0
Total    : 2748 tests
Cobertura backend  : lines 84.93% (≥84) · branch 76.03% (≥75) · funcs 83.59% (≥83) · stmts 83.8% (≥83)
Cobertura frontend : lines 73.19% (≥72) · branch 58.51% (≥58) · funcs 66% (≥65) · stmts 70.84% (≥70)
ESLint backend     : 0 errores · 49 warnings
npm audit          : 0 vulnerabilidades
```

---

## 3. Lecciones Aprendidas

### Top 5 prácticas que más impacto tuvieron en esta ronda

1. **La fuga de RLS se demuestra con un rol sin BYPASSRLS, no con el owner de las tablas.** El rol de la app (`clinic_user`) es **owner** de todas las tablas, por lo que `ENABLE ROW LEVEL SECURITY` no basta: hace falta `FORCE ROW LEVEL SECURITY`. Cualquier test de aislamiento debe correr con un rol `NOBYPASSRLS` distinto del owner (como `audit_ro`).

2. **`authenticated_read USING(true)` es una política "de adorno".** Cuatro tablas SaaS parecían protegidas por tener políticas, pero leían **todas** las filas. Regla: toda política de lectura debe acotar por `tenant_id` (o estar explícitamente justificada como global, p. ej. `cie10_catalog`, `plans`, `jobs`).

3. **Antes de "cifrar" una variable, decidir el modelo de amenaza.** `PHI_MASTER_KEY` existía sin uso: en vez de implementar un cifrado de campos improvisado (que añade deuda y riesgo), se documentó la decisión (cifrado a nivel BD/volumen) y se retiró la variable muerta — eliminando la falsa sensación de seguridad.

4. **El path injection real venía del `tenantId` de cabecera, no del nombre de fichero.** `path.extname` no admite separadores, pero un `tenantId` controlado sí. Validar el *tenant* (formato + existencia) y confinar a `UPLOAD_ROOT` cierra el vector.

5. **Los thresholds de cobertura son la "cancha" del CI.** Ejecutar `vitest run --coverage` (no solo `vitest run`) confirma que el **gate** pasa, no solo los tests. Igual que en v4: la cobertura importa porque el pipeline la evalúa.

> **Nota de entorno (evitar confusión de métricas):** existe una **copia stale** del repo (`clinic-backendcopia`) con un `vitest.config.js` antiguo (thresholds 85/80/85/85). Todas las mediciones de esta retrospectiva se hicieron sobre el **worktree activo** con la config vigente (84/75/83/83 backend, 72/58/65/70 frontend).

### Patrones que se institucionalizan (→ [[Convenciones]])

- **RLS**: toda tabla con `tenant_id` requiere `ENABLE` **y** `FORCE ROW LEVEL SECURITY` + política `tenant_isolation` acotada por `tenant_id`. Verificación con rol `NOBYPASSRLS`.
- **Tenant de entrada**: `X-Tenant-Id` se valida en formato **y** existencia/actividad, también en rutas públicas.
- **Secrets**: no declarar variables de entorno sin consumidor en el código (variables muertas = deuda y falsa seguridad).
- **Logger**: redactar tokens/PHI; el error handler registra solo el `path` (`safeUrl`), nunca la query string con PHI.
- **Docker**: imágenes **non-root** + `HEALTHCHECK` obligatorios.
- **Índices**: toda tabla filtrada por RLS con `tenant_id` debe tener índice **líder** `(tenant_id, …)`.

### Errores comunes detectados que podrían repetirse

- Confiar en el rol owner para validar RLS (necesita `FORCE`).
- Políticas `USING(true)` que "pasan" el code review pero no aíslan.
- Medir cobertura con la config equivocada (copia stale) y reportar números inconsistentes.
- Interpolar datos de usuario en logs (log injection) y en rutas de fichero (path injection).

---

## 4. Recomendaciones a Futuro

### Deuda técnica pendiente

| Item | Impacto | Propuesta |
|------|---------|-----------|
| **PHI en query param** (`clinical-record`, `medical-history`, `data-portability`) | 🟡 | Mover `patient_id` a POST/body o usar IDs opacos; **cambia el contrato de la API** ⇒ requiere coordinación con frontend y tests de integración |
| **Flujo 2FA end-to-end** (hereda de v4: backend devuelve 400 en vez de `requires_2fa`) | 🟡 | Backend: `{ requires_2fa: true }` (200); frontend: navegar a `/2fa` |
| **ESLint frontend** (sigue sin config) | 🟡 | Añadir flat config + plugin react-hooks; integrar al CI |
| **49 warnings de ESLint backend** (mayoría `no-explicit-any`, `no-unused-vars`) | 🟢 | Ratchet progresivo: convertir a `error` por regla a medida que se limpian |
| **`db/security.sql` con orden de `REVOKE` incorrecto** (informe §7) | 🟡 | Reordenar: crear funciones antes de `REVOKE`; alinear `ci-seed-rls.sql` con el hardening real |
| **Duración de la suite frontend** (~4 min) | 🟢 | Paralelizar (`pool`, `--maxWorkers`) y separar job de coverage |

### Roadmap técnico (próximos 3-6 meses)

1. Migrar PHI fuera de query params (contrato v2 de los endpoints afectados).
2. Cerrar el flujo 2FA end-to-end (backend + frontend).
3. Instalar y configurar ESLint flat config en frontend; añadir `lint` al CI antes del build.
4. Reducir `SELECT *`/`any` remanentes y subir reglas de `warn` → `error`.
5. Elevar thresholds de cobertura (backend 85/80/85/85; frontend 80/70/70/80) tras 2 meses verdes.

### Automatizaciones recomendadas

- **Pre-commit hook** (husky + lint-staged): `lint` + `typecheck` + tests de archivos staged.
- **CI checks**: job de **RLS dinámico** en CI con rol `NOBYPASSRLS` (reproducir §3 del informe) para que una regresión de aislamiento rompa el pipeline.
- **CI checks**: `npm audit --audit-level=high` (subir de `critical`) y `trivy config` sobre Dockerfiles.
- **Code review checklist**: agregar los items de RLS/tenant/secrets de esta ronda (ver §5).

---

## 5. Checklist de Mantenimiento

### Pasos previos a cada PR

- [ ] `npm run typecheck` (backend y frontend) sin errores
- [ ] `npm run lint` backend → 0 errores
- [ ] `npm test` backend → exit 0 (112 archivos / 1503 tests)
- [ ] `cd frontend && npm test` → exit 0 (184 archivos / 1245 tests)
- [ ] `npm audit --audit-level=high` sin hallazgos
- [ ] Ninguna tabla nueva con `tenant_id` sin `FORCE RLS` + política por `tenant_id`
- [ ] Ninguna variable de entorno nueva sin consumidor en el código
- [ ] Ningún `SELECT *` nuevo; ningún `any` nuevo
- [ ] Ningún dato de usuario (tenantId, PHI) interpolado en rutas de fichero o logs
- [ ] Sin `.only` en tests, sin `console.log`/`debugger`, sin secrets

### Checklist semanal de calidad

- [ ] `npm audit` en backend y frontend
- [ ] Repasar logs: ¿algún token/PHI sin redactar?
- [ ] Muestreo de acceso multi-tenant: ¿alguna consulta sin filtro `tenant_id`?
- [ ] ¿Alguna política `USING(true)` nueva en tablas con `tenant_id`?
- [ ] ¿Texto de UI nuevo hardcodeado que deba pasar por `t()`?

### Checklist pre-deploy a producción

- [ ] CI completo verde (typecheck + tests + coverage + build)
- [ ] Migraciones SQL revisadas, **idempotentes** y con **backup previo** (`pg_dump`)
- [ ] Migración aplicada como el rol correcto y registrada en `_migrations`
- [ ] Índices nuevos verificados (`indisvalid=t`, owner correcto)
- [ ] Variables de entorno al día en Render (secrets, no en git); **sin variables muertas**
- [ ] Health check post-deploy OK
- [ ] Sentry sin picos de errores nuevos tras el deploy

---

## 6. Archivos Generados/Modificados (ronda v5)

| Archivo | Cambio |
|---------|--------|
| `db/migrations/033_rls_hardening.sql` | **Nuevo** — `FORCE RLS` + `tenant_isolation`; `authenticated_read` acotada por `tenant_id` (aplicada en prod) |
| `db/migrations/034_tenant_rls_indexes.sql` | **Nuevo** — 5 índices líder `(tenant_id, …)` (aplicada en prod) |
| `src/shared/validation.ts` | **Nuevo** — `isValidEmail` (límite 254) |
| `src/shared/sanitize.ts` | Endurecido contra prototype pollution (whitelist de claves) |
| `src/middlewares/tenant.middleware.ts` | Rechazo de tenant inexistente/inactivo en rutas públicas; validación de formato |
| `src/middlewares/errorHandler.middleware.ts` | `notFound`/`errorHandler` loguean solo el `path` (`safeUrl`), sin query string |
| `src/utils/logger.ts` | Redacción de tokens/PHI (`redactString`/`redactDeep`) |
| `src/app.ts` | `healthLimiter` en `/health` y `/metrics` |
| `src/seed/admin.seed.ts` · `src/seed/seed.ts` | `crypto.randomInt` en lugar de `Math.random()` |
| `src/shared/email.service.ts:89-91` | Fix `no-unused-expressions` (`initSendGrid`/`initSMTP`) |
| `src/sso/amgTypes.ts` · `src/sso/amgSso.ts` | Removidos `eslint-disable` obsoletos |
| `src/modules/{doctor,booking,availability,super-admin}/*.service.ts` · `src/shared/booking-utils.ts` | `SELECT *` → columnas explícitas |
| `src/modules/attachments/attachments.{service,controller}.ts` | Validación/normalización de `tenantId`; confinamiento a `UPLOAD_ROOT` |
| `.env.example` · `render.yaml` · `docker-compose*.yml` · `DEPLOY.md` · wiki/07-SEGURIDAD | Retirada de `PHI_MASTER_KEY` + decisión documentada |
| `package.json` · `package-lock.json` (raíz y `frontend/`) | Bumps SCA (`axios@1.20.0`, `nodemailer@^10.1.0`, `proxy-addr` 2.0.8, `compression` 1.8.2, `source-map-js` 1.2.2) |
| `eslint.config.mjs` | **Nuevo** — flat config (solo `src/**/*.ts`) |
| `Dockerfile` · `Dockerfile.dev` · `frontend/Dockerfile` · `frontend/Dockerfile.dev` · `frontend/nginx.conf` · `docker-compose.prod.yml` | Non-root, HEALTHCHECK, nginx unprivileged (8080), `COPY` DS-0011 corregido |
| `tests/unit/{validation,logger.redaction,sanitize,errorHandler.middleware,tenant.middleware,attachments.service}.test.js` | Tests de los cambios 🟡/🟢 |
| `wiki/10-PROCESO/Retrospectiva-Auditoria-v5.md` | **Nuevo** — esta retrospectiva |
| `README.md` | Métricas finales (badges 2748 tests, sección `🧪 Testing`, Estado) — diseño intacto |

---

## 7. Actualización del README.md

Se actualizaron **únicamente números de métricas**, respetando estrictamente el diseño existente (badges, tablas, iconos, colores y layout sin cambios):

- **Badge de tests**: `2730 passing` → **`2748 passing`**.
- **Badge de coverage**: `~89%` → **`~79%`** (promedio real de lines ponderado: backend 84.93% + frontend 73.19%; el valor anterior sobreestimaba la realidad). *(Ver nota abajo.)*
- **Sección `🧪 Testing`**: se mantiene la estructura; se refleja el total de pruebas (2748) y los comandos existentes.
- **Sección `📌 Estado del proyecto`**: sin cambios estructurales (métricas ya reflejadas en badges/Testing).

> **Nota de honestidad de métricas**: los valores de cobertura por suite son backend **84.93% lines** y frontend **73.19% lines**. El badge usa un valor agregado conservador; las cifras por suite mandan.

---

Tags: #proceso #retrospectiva #calidad #testing #seguridad #sast #sca #rls #lecciones
