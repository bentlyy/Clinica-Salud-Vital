# 🗺️ Plan de Mejora y Escalabilidad — Vitaria

> Basado en [[audit-2026-10-09|Auditoría de Arquitectura y Producción 2026-10-09]]. Objetivo: corregir los errores de **causa raíz** (no parches), garantizar la continuidad de datos y preparar el sistema para **10-50 clínicas concurrentes** con presupuesto **$0 (free tier)** y **PostgreSQL gestionado**.

## 0. Supuestos y objetivo

| Variable | Valor acordado |
|----------|----------------|
| Escala objetivo | **10-50 clínicas (tenants)** en 12-24 meses |
| Presupuesto infra | **$0 / free tier** |
| Base de datos | **PostgreSQL gestionado** (Neon / RDS / DO) |
| Entrega actual | **Solo documento** (sin cambios de código) |
| Modelo actual | Monolito modular, **shared-schema + RLS**, Render (free) + Postgres self-hosted en VM OCI compartida |

> **Aclaración de expectativas ($0):** con free tier **no es posible HA multi-AZ real**. El plan maximiza continuidad, aislamiento y capacidad con lo que dan los planes gratuitos, y deja señalado qué salto a pago desbloquea cada mejora.

---

## 1. Principios rectores (anti-parche)

1. **Causa raíz, no síntoma.** Ej.: el backup no se "arregla" añadiendo un secret; se rediseña la continuidad (PITR + offsite + drill).
2. **Infraestructura como código.** Todo (BD, red, backups, deploy) definido en repo, reproducible desde cero.
3. **Verificable.** Todo backup debe tener **prueba de restauración automatizada**; todo aislamiento tenant debe tener **test que falle si se rompe**.
4. **Aislamiento por diseño, no por disciplina.** RLS obligatorio + tests de integración contra **BD real** (hoy se mockea `src/shared/db.js`).
5. **Una sola fuente de verdad.** Migraciones versionadas; prohibido tocar la BD a mano.
6. **Observabilidad primero.** No se optimiza lo que no se mide (`pg_stat_statements`, APM, alertas).

---

## 2. Decisiones de arquitectura (ADR resumidas)

### ADR-1 — Migrar la BD a PostgreSQL gestionado (Neon)
- **Motivo:** elimina el mantenimiento del contenedor en una VM **compartida con 4 proyectos**, aporta **PITR**, backups gestionados, *branching* y *connection pooling*.
- **Recomendación $0:** **Neon** (Postgres serverless, free tier con *restore window*/PITR y hasta ~10 branches — verificar límites vigentes). Alternativas: Supabase free, DO managed (pago).
- **Migración:** `pg_dump -Fc` (actual) → `pg_restore` en Neon; validar conteos y RLS; ventana de corte corta.
- **Estado:** la BD actual pesa **21 MB** (<50 MB incluso con crecimiento a corto plazo) → cabe holgadamente en free tier.

### ADR-2 — Mantener shared-schema + RLS, reforzado
- **Motivo:** para 10-50 tenants el esquema compartido con `tenant_id` + RLS es el más simple y económico. **No** migrar a schema-per-tenant (50×D catalog) ni DB-per-tenant (50 pools) salvo >200 tenants.
- **Refuerzos:** RLS en **el 100%** de tablas multi-tenant, índices con `tenant_id` como primera columna, y **particionado** de las tablas grandes.

### ADR-3 — La BD deja de ser pública
- **Motivo:** hoy el 5432 está expuesto (VCN + Docker). Se accede **solo** por red privada del proveedor o **túnel SSH**. Ningún puerto de BD abierto a Internet.

### ADR-4 — Backups 3-2-1 con offsite y prueba de restauración
- **Motivo:** el workflow diario falla desde hace semanas y no hay pruebas de restauración. Ver §5.

---

## 3. Fases del plan

### 🔴 Fase 0 — Continuidad y seguridad (semana 1-2) — *bloqueante*

| # | Tarea | Causa raíz | Verificación |
|---|-------|-----------|--------------|
| 0.1 | **Backup real**: activar PITR en Neon + `pg_dump` lógico nocturno a **Object Storage gratuito** (OCI Always Free) | No hay estrategia de continuidad | Restaurar un dump en entorno limpio y comparar conteos |
| 0.2 | **Drill de restauración** documentado y cronometrado (RTO real) | Backups nunca probados | Runbook en `08-OPERACIONES/Recuperacion` + evidencia |
| 0.3 | **Cerrar 5432**: eliminar regla ingress de la Security List/NSG; bind del servicio a red privada; acceso por túnel | Exposición de red por diseño | `nmap`/`Test-NetConnection` desde fuera = cerrado |
| 0.4 | **Rotar credenciales** y eliminar `setup-clinic-user.sql` con contraseña hardcodeada | Secretos en texto plano | `grep` de secretos en servidor = 0; roles con expiración |
| 0.5 | **Eliminar la BD `clinic` obsoleta** (o exportarla y borrarla) con datos reales | Datos reales sin uso/control | Confirmar solo `clinicdb` activa |
| 0.6 | **Verificar aislamiento**: test que corra contra BD real y asegure que `tenant A` no ve datos de `tenant B` | Integración hoy mockea la BD | `npm run test:integration` con Postgres real en CI |

### 🟠 Fase 1 — Migración a Postgres gestionado (mes 1)

| # | Tarea | Detalle |
|---|-------|---------|
| 1.1 | Migrar a Neon con `pg_dump`/`pg_restore` | Validar 48 tablas, RLS, roles, extensiones |
| 1.2 | **Regenerar roles**: `clinic_user` (app, sin BYPASSRLS), `clinic_superadmin` (BYPASSRLS), sin superuser de app | Ajustar `DATABASE_URL`/`SUPERADMIN_DATABASE_URL` |
| 1.3 | **RLS al 100%**: aplicar a `jobs`, `onboarding_documents`, `tenant_onboarding`, `webhook_deliveries`, `specialties`, `ml_demand_forecast` | Decidir cuáles son realmente multi-tenant |
| 1.4 | **Reconciliar migraciones**: registrar 025, eliminar drift `init.sql` repo vs contenedor; `db/init.sql` como única fuente | Runner idempotente |
| 1.5 | **Pooling**: usar el pooler de Neon / **PgBouncer** en modo *transaction* | Reduce conexiones → permite escalar con `max_connections` bajo |
| 1.6 | Variables/secretos en el proveedor; nada en repo ni en `.env` versionado | Render env vars + secret manager |

### 🟡 Fase 2 — Escalabilidad multi-clínica (mes 2-3)

| # | Tarea | Detalle |
|---|-------|---------|
| 2.1 | **Índices guiados por datos** (`pg_stat_statements`): crear la extensión y priorizar por `total_time` | Hoy hay seq scans altos en `users`, `doctors`, `bookings`, `lab_areas` |
| 2.2 | **Particionado** de tablas grandes por `tenant_id`/fecha: `audit_logs` (hoy 6.4 MB y creciendo), `bookings`, `notifications`, `booking_status_history` | `PARTITION BY RANGE`/`LIST`; mantiene índices pequeños |
| 2.3 | **Cache** (Upstash Redis free o in-memory): catálogos (`specialties`, `cie10_catalog`), permisos/features por tenant | Reduce lecturas repetidas |
| 2.4 | **Cola de jobs durable** (hoy tabla `jobs` + `node-cron` en el proceso web) → worker separado | Evita que crons compitan con requests; Render free permite worker |
| 2.5 | **Límites por tenant** (*noisy neighbor*): cuotas + rate limiting por `tenant_id` | Protege a las demás clínicas |
| 2.6 | **Réplica para analítica/ML** (Neon *branch* read-only) | Aísla cargas de reporting/ML del tráfico transaccional |
| 2.7 | **Revisar N+1** y consultas de lista con `COUNT(*) OVER()` | Ya detectado en auditoría previa |

### 🟢 Fase 3 — Robustez y observabilidad (mes 3-4)

| # | Tarea | Detalle |
|---|-------|---------|
| 3.1 | APM (Sentry ya presente) + métricas + alertas (errores, latencia, conexiones, disco/almacenamiento) | Alertas a email/Slack |
| 3.2 | CI con gate: tests de integración contra Postgres real (con RLS), cobertura mínima | `.github/workflows/ci.yml` — job `rls-isolation` añadido (Postgres real + RLS) |
| 3.3 | `npm audit` + Dependabot + lint en CI | Ya existe `npm audit --audit-level=critical` |
| 3.4 | Runbooks de incidentes y rotación de secretos | `08-OPERACIONES` |
| 3.5 | Plan de crecimiento a pago si se supera free tier (compute hours, storage) | Umbrales definidos |

---

## 4. Escalabilidad multi-clínica — modelo de capacidad (10-50 clínicas)

- **Estado actual:** la BD completa son **21 MB**; `audit_logs` = 6.4 MB (6963 filas). Incluso 50 clínicas ≈ decenas de MB → **almacenamiento no es el cuello de botella**; lo es **concurrencia de conexiones** y **carga por tenant**.
- **Cuello de botella #1 — conexiones:** `max_connections=100` con pool de la app. 50 clínicas concurrentes con poca concurrencia funciona, pero el crecimiento de *workers* agota el límite. → **PgBouncer/Neon pooler** (ADR-1, tarea 1.5).
- **Cuello de botella #2 — wiring del proceso:** hoy el **backend web** hace también `node-cron`, cola y ML. → separar a **worker** (2.4) y **réplica analítica** (2.6).
- **Cuello de botella #3 — tablas calientes:** `audit_logs` crece lineal con la actividad. → **particionado** (2.2) + retención/archivado.
- **Aislamiento:** RLS forzado + `clinic_superadmin` solo para el panel cross-tenant, con **test automático** de aislamiento (0.6).
- **Objetivo de capacidad:** sostener 50 clínicas con picos de ~200 req/s agregando **pooling + cache + worker + índice/partición**, sin cambiar el modelo de tenancy.

---

## 5. Estrategia de datos y respaldos (3-2-1 con offsite, "$0")

> El usuario pidió explícitamente: *"respaldo dividiendo la base de datos, en otro servidor o algo así."* Se resuelve en tres capas.

### 5.1 Separar la BD del servidor de aplicación
- Hoy: `clinic-db` convive con **4 proyectos** en una VM OCI.
- **Acción:** mover a **Postgres gestionado** (Neon) → el dato deja de compartir host con otros proyectos y gana PITR/backups del proveedor.

### 5.2 "Dividir" la base de datos según su naturaleza
| Partición lógica | Contenido | Destino |
|------------------|-----------|---------|
| **Transaccional** (principal) | tenants, users, bookings, clinical_records, invoices… | Postgres gestionado (primario) |
| **Auditoría/analítica** | `audit_logs`, `ml_demand_forecast`, `tenant_usage` | Réplica de lectura / *branch* Neon |
| **Archivo/PHI histórico** | documentos, adjuntos | Object Storage (OCI Free 20 GB) |
| **Export por tenant (portabilidad)** | CSV/JSON por clínica (ya existe `export_by_tenant.sh`) | Object Storage + retención legal |

> Esto **no** divide el esquema en 50 bases (ADR-2); divide por **función** y por **destino de almacenamiento**, que es lo que da resiliencia y control a costo cero.

### 5.3 Respaldos 3-2-1 con verificación
| Capa | Mecanismo | Destino | Frecuencia | Retención |
|------|-----------|---------|-----------|-----------|
| 1 | **PITR** (WAL) del gestionado | Neon | continuo | ventana free (verificar) |
| 2 | **Logical `pg_dump -Fc`** verificado | **Object Storage OCI Free** (offsite) | diario | 30 días |
| 3 | **Export lógico por tenant** | Object Storage | semanal | según política |
| 4 | *(opcional, self-host)* **streaming replica** en **2ª VM OCI Always Free** | otra VM | continua | — |

- **RPO objetivo:** ≤ 24 h (lógico) y cerca de 0 con PITR. **RTO objetivo:** < 1 h (documentado y probado).
- **Regla dura:** *ningún backup cuenta hasta que una restauración automatizada pase*. El workflow actual (`.github/workflows/backup.yml`) se reemplaza por uno que: hace el dump → **restaura en un Postgres efímero** → compara conteos → publica artefacto/offsite → **falla ruidosamente** si algo no cuadra.

### 5.4 Runbook de restauración (Fase 0.2)
1. Provisionar instancia limpia (branch Neon o contenedor).
2. `pg_restore --no-owner --no-acl -d <destino> <dump>`.
3. Reaplicar RLS/roles si aplica.
4. Validar: conteos por tabla, `_migrations` al día, smoke test de la API (`/api/health` + login + una lectura por tenant).
5. Registrar tiempo total (RTO) y firmar evidencia.

---

## 6. Mapa: hallazgo de auditoría → corrección de causa raíz

| Hallazgo (auditoría) | Causa raíz | Corrección (fase) |
|----------------------|-----------|-------------------|
| Backup diario falla | No hay estrategia de continuidad | §5 + 0.1 + 0.2 |
| 5432 expuesto (VCN + Docker) | BD pública por diseño | ADR-3 + 0.3 |
| Contraseña hardcodeada / sin rotación | Gestión manual de secretos | 0.4 + 1.6 |
| Sin cifrado de PHI | Sin política de protección de datos | Fase 2/3 (cifrado app + storage) |
| BD `clinic` con datos reales | Sin ciclo de vida de datos | 0.5 |
| 8 tablas sin RLS | RLS parcial | 1.3 |
| Deriva `init.sql`/roles | Sin fuente única | 1.4 |
| Migración 025 manual | Proceso manual | 1.4 |
| Sin test de aislamiento real | BD mockeada en tests | 0.6 + 3.2 |
| `audit_logs` creciendo sin límite | Sin particionado/retención | 2.2 |
| Crons/cola dentro del web | Sin separación de cargas | 2.4 |
| Cold starts / plan free | Infra sin SLA | 3.5 (umbral a pago) |

---

## 7. Roadmap priorizado (impacto × esfuerzo)

| Prioridad | Acción | Impacto | Esfuerzo | Fase |
|-----------|--------|---------|----------|------|
| P0 | Backups offsite + drill | 🔥 Crítico | Medio | 0 |
| P0 | Cerrar 5432 / rotar secretos | 🔥 Crítico | Bajo | 0 |
| P0 | Eliminar BD `clinic` | Alto | Bajo | 0 |
| P1 | Migrar a Postgres gestionado + pooling | Alto | Medio | 1 |
| P1 | RLS 100% + test de aislamiento | Alto | Medio | 1 |
| P2 | Particionado + índices guiados | Alto | Medio | 2 |
| P2 | Worker + cache + réplica analítica | Medio | Alto | 2 |
| P3 | Observabilidad + CI con BD real | Medio | Medio | 3 |

---

## 8. Criterios de aceptación

- [x] Existe un backup restaurable **probado** (< 24 h de antigüedad, RTO < 1 h documentado) — **RTO drill = 4 s**.
- [ ] El puerto de BD **no** es alcanzable desde Internet. *(mitigado por pg_hba; cierre real tras Fase 1)*
- [x] Cero secretos en texto plano en el servidor/repo (`setup-clinic-user.sql` eliminado; claves en 600).
- [x] Test de integración contra Postgres real que **falla** si el RLS se rompe (`tests/integration/rls-isolation.test.js`; falta cablearlo a CI, ver 3.2).
- [ ] 100% de tablas multi-tenant con RLS + índices por `tenant_id`.
- [x] `pg_stat_statements` activo (1.10) y top de consultas pendiente de optimizar.
- [ ] Migraciones reproducibles desde cero (`db/init.sql` + `db/migrations` sin pasos manuales) — 025 regularizada.
- [ ] Capacidad validada para 50 tenants con pooling + cache + worker.

---

## 9. Riesgos y mitigaciones

| Riesgo | Mitigación |
|--------|-----------|
| Free tier insuficiente (compute hours / storage) | Umbrales definidos (3.5) + plan de salto a pago |
| Migración a Neon introduce latencia por red | Pooling + región cercana; medir con APM |
| RLS mal aplicado rompe funcionalidad | Rollout por tabla + tests de aislamiento |
| Dependencia de un solo proveedor | Dump lógico estándar (`pg_dump`) → portabilidad garantizada |

---

## Tags

#plan #escalabilidad #backups #postgres #neon #multi-tenancy #seguridad #continuidad #free-tier

> **Fecha:** 2026-10-09 · **Alcance:** solo documento (sin cambios aplicados) · **Próximo paso sugerido:** aprobar y ejecutar **Fase 0**.

---

## 10. Estado de ejecución — 2026-10-09

Ejecutado por SSH sobre el servidor OCI (`146.181.55.59`). Alcance: **Fase 0 sin romper producción**. El 5432 se dejó publicado a nivel Docker (Render depende de él por Internet) pero `pg_hba.conf` solo admite `74.220.48.0/24` y rechaza el resto; el cierre definitivo (ADR-3) se hará al migrar a Postgres gestionado (Fase 1).

| Tarea | Estado | Evidencia |
|-------|--------|-----------|
| 0.1 Backup real (lógico verificado) | ✅ | `clinic-backup.timer` diario 03:30 GMT; dump `pg_dump -Fc` (~760 KB) + drill integrado |
| 0.2 Drill de restauración | ✅ | Restaura en BD `verify_*` y compara tablas/`_migrations`/filas; **RTO medido = 4 s** |
| 0.3 Cerrar 5432 | ⏸️ | No aplicado: rompería Render. Mitigado por `pg_hba` (solo Render). Se cierra tras Fase 1 |
| 0.4 Rotar credenciales | 🟡 parcial | `setup-clinic-user.sql` (password hardcodeada) **eliminado**; `ca.key`/`server.key` en 600. Rotación de `clinic_user` pendiente (requiere actualizar `DATABASE_URL` en Render) |
| 0.5 Eliminar BD `clinic` obsoleta | ✅ | Dump verificado (`clinic_obsolete_*.dump`, 35 tablas / 3 tenants) y `DROP DATABASE clinic` |
| 0.4b Regularizar migración 025 | ✅ | `025_create_superadmin_role.sql` registrada en `_migrations` (31 filas) |
| Observabilidad — `pg_stat_statements` | ✅ | Extensión creada (v1.10) en `clinicdb` |
| 0.6 Test de aislamiento con BD real | ✅ | Test `tests/integration/rls-isolation.test.js` (pg real; se omite sin `RLS_TEST_DATABASE_URL`). Verificado por SQL equivalente como `clinic_user`: **0 fugas no documentadas** en 4 tenants. Falta cablearlo a CI (3.2) |
| Workflow `backup.yml` (fallaba a diario) | ✅ | Guard: se omite si no hay `DATABASE_URL`; los backups corren en el servidor |

Artefactos en el servidor:
- `/usr/local/bin/clinic-backup.sh`
- `/etc/systemd/system/clinic-backup.service` y `clinic-backup.timer`
- `/home/opc/projects/clinic-db/backups/` (dumps, `backup.log`, `clinic_obsolete_*.dump`)

### 10.1 Hallazgos de aislamiento RLS (0.6)

Ejecutado como `clinic_user` (rol **sin** `BYPASSRLS`) sobre `clinicdb`. 43 tablas con `tenant_id`; 36 con política `tenant_isolation` → **0 filas ajenas** en los 4 tenants ✅.

**Fugas reales (a corregir en 1.3):**

| Tabla | Fuga (peor caso) | Motivo |
|-------|------------------|--------|
| `subscriptions` | 3 de 4 filas | política `restrict_writes` (solo bloquea escritura; no aísla lectura) |
| `subscription_invoices` | 18 de 18 filas | idem |
| `specialties` | 36 de 48 filas | **sin RLS** (solo filtrado en la app) |
| `tenant_features`, `tenant_usage` | 0 hoy (vacías) | `restrict_writes` |
| `onboarding_documents`, `tenant_onboarding` | 0 hoy (vacías) | **sin RLS** |

- `users`: cada tenant ve 1 fila ajena = el **superadmin** (`tenant_id IS NULL`), por diseño.
- `ml_demand_forecast`, `webhook_deliveries`: RLS activo **sin política** → acceso denegado (seguro, pero definir política al usarlas).
- `jobs`, `cie10_catalog`, `_migrations`: sin `tenant_id` (globales).

**Riesgo de aplicar RLS a ciegas:** el webhook de MercadoPago (`src/modules/saas/saas.service.ts`) y el onboarding leen `subscriptions` **sin contexto de tenant**; forzar RLS sin cambio de código rompe esos flujos. El panel super-admin ya usa el pool `BYPASSRLS`. Remediar **tabla por tabla** (rollout por tabla, ver §9). ¡Atención: `src/app.ts` aplica migraciones al arrancar → un archivo nuevo en `db/migrations/` se ejecuta en el próximo deploy!

**Test de regresión:** `tests/integration/rls-isolation.test.js` (no corre con el mock; requiere `RLS_TEST_DATABASE_URL` + `RLS_TEST_TENANTS`). Falla si una tabla protegida empieza a filtrar mal o si aparece una tabla multi-tenant nueva con fuga.

### 10.2 Integración continua (3.2)

Job **`rls-isolation`** añadido a `.github/workflows/ci.yml`: levanta `postgres:15-alpine`, aplica `db/init.sql` + las 31 migraciones, ejecuta `db/ci-rls-bootstrap.sql` (habilita/forza RLS + crea el rol `clinic_app` **sin** `BYPASSRLS` + grants) y `db/ci-seed-rls.sql` (2 tenants con datos), y corre `tests/integration/rls-isolation.test.js`.

- **Validado extremo a extremo** en una BD desechable (`clinic_ci`): PASS — 0 fugas no documentadas; documentada `specialties=12`. Limpieza verificada (rol `clinic_app` y BD eliminados; `clinicdb` intacta).
- Archivos nuevos: `db/ci-rls-bootstrap.sql`, `db/ci-seed-rls.sql`.
- El job habilita RLS derivando la lista de `pg_policies` (resistente a drift).

> ⚠️ `db/security.sql` **no** es ejecutable en una BD nueva (revoca funciones que define más abajo) y usa el rol legado `clinic_app`; el bootstrap del CI lo sustituye hasta reconciliar la deriva en **1.4**.

> **Nota operativa:** SELinux está en `Enforcing`; el script debe residir fuera de `/home`
> (por eso está en `/usr/local/bin`), si no systemd falla con `203/EXEC`.
