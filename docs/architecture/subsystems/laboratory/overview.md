# SUB-8 — Laboratorio

> **Estado:** descripción AS-IS completada · **Certeza global:** confirmado (lectura de código).
> **Evidencia principal:** `src/modules/laboratory/*`; montaje en `src/app.ts:278` (import `src/app.ts:53`); tablas en `db/init.sql:276-784` y migraciones `002`–`005`, `021`, `027`, `028`; RLS en `db/security.sql:90-139`.

## 1. Propósito

Gestionar el **laboratorio clínico** de la clínica: **catálogo de exámenes** (`lab_tests`), **solicitudes médicas** (`lab_requests` → `lab_request_items`), **toma/recepción/verificación/asignación de muestras** (`lab_samples`), **control de calidad** (`lab_qc_records`), **equipos** (`lab_equipment`), **reactivos y stock** (`lab_reagents`), **notificaciones internas** (`lab_notifications`), **dashboards/analytics**, **validación por tecnólogo→médico→firma→entrega**, **generación de PDF de la orden** y **envío de resultados al paciente por email/enlace**.

Es el subsistema de mayor superficie del backend después de auth/clinical: **46 endpoints** y **10 tablas** bajo RLS.

## 2. Componentes (1 módulo backend, 7 archivos)

| Archivo | Responsabilidad | LOC |
|---|---|---|
| `laboratory.routes.ts` | Router + autorización por rol + feature gate | 101 |
| `laboratory.controller.ts` | Orquestación, ownership, eventos SSE | 395 |
| `laboratory.service.ts` | Todo el dominio (catálogo, órdenes, muestras, QC, equipos, reactivos, notificaciones, dashboards) | 1022 |
| `laboratory.schema.ts` | Zod (crear orden, id) | 14 |
| `lab-result-email.service.ts` | Resultados por email + token público | 135 |
| `lab-order-pdf.service.ts` | PDF de la orden (pdfkit) | 119 |
| `lab-events.service.ts` | Bus de eventos por tenant (EventEmitter → SSE) | 33 |

## 3. Superficie HTTP (montaje `src/app.ts:278` → `/api/laboratory`)

| Fase | Middleware |
|---|---|
| Prefijo | `GET /results/shared/:token` — **público** (sin auth) |
| Global resto | `authMiddleware` → `requireFeature('laboratory')` |
| Por ruta | `authorize(...)` con roles por endpoint |

### 3.1 Roles por grupo de endpoints

| Grupo | Rutas | Roles |
|---|---|---|
| Catálogo `tests` | `GET /tests`; escritura `POST/PUT/DELETE /tests/:id` | lectura: cualquiera autenticado + feature; escritura: `admin`,`superadmin` |
| Técnico (`lab/*`) | `GET /lab/all`, `PATCH /lab/items/:item_id/status`, `PATCH /lab/:id/lab-type` | `admin`,`superadmin`,`lab_technician` |
| Dashboard | `GET /dashboard`, `/dashboard/area/:areaId`, `/dashboard/analytics` | `admin`,`superadmin`,`lab_technician` |
| Muestras | `GET/POST /samples`, `GET /samples/:id`, `PATCH /samples/:id/{receive,verify,assign,qc,reject}` | `admin`,`superadmin`,`lab_technician` |
| Ítems/resultados | `PATCH /items/:item_id/{result,validate-tech,validate-doctor,sign,deliver}`, `GET /items/:item_id/history` | `result`: +`doctor`; `validate-doctor`/`sign`: `admin`,`superadmin`,`doctor`; resto `+lab_technician` |
| Áreas | `GET /areas` (cualquiera), `POST /areas` (`admin`,`superadmin`) | — |
| QC | `GET /qc`, `GET /qc/statistics` (`+lab_technician`), `POST /qc` (`admin`,`superadmin`) | — |
| Equipos | `GET /equipment` (`+lab_technician`), `POST/PUT` (`admin`,`superadmin`) | — |
| Reactivos | `GET /reagents` (`+lab_technician`), `POST`, `PATCH /reagents/:id/stock` (`admin`,`superadmin`) | — |
| Notificaciones | `GET /notifications`, `PATCH /notifications/:id/ack` | `admin`,`superadmin`,`lab_technician`,`doctor` |
| Eventos SSE | `GET /events` | `admin`,`superadmin`,`lab_technician` |
| Órdenes (raíz, **al final**) | `POST /results/email`; `GET /`; `GET /:id`; `POST /`; `PATCH /:id/status`; `DELETE /:id`; `GET /:id/pdf` | ver `laboratory.routes.ts:93-99` |

> Las rutas paramétricas (`/:id`) se declaran **después** de las literales para evitar capturas (comentario explícito `laboratory.routes.ts:92`).

## 4. Reglas de negocio clave

### 4.1 Numeración de orden y muestras
- `request_number` = `LAB-<año>-<6 dígitos>` con `crypto.randomInt`, `UNIQUE`, reintento hasta 3 veces ante `23505` (`laboratory.service.ts:7-11,146-165`).
- `sample_code` = `SMP-<6 dígitos>` (`laboratory.service.ts:585-588`) — **sin chequear unicidad ni colisión**.

### 4.2 Ciclo de vida (máquina de estados implícita)
- Estados permitidos por DB (`CHECK`) en `lab_requests` y `lab_request_items`: `pending, received, verified, assigned, processing, qc_review, result_entered, validated_tech, validated_doctor, signed, delivered, cancelled, rejected, repeated` (`db/init.sql:329,351` + migración `003:38-39,53-54`).
- **No hay validación de transiciones** en el servidor: `updateLabRequestStatus` y `updateLabRequestItemStatus` escriben el `status` recibido en el body sin enum Zod ni guarda de orden (`laboratory.service.ts:263-270,337-344`). Ver FND-E3.
- El flujo nominal `validateItemByTech → validateItemByDoctor → signItem` sí impone precondiciones (`status IN (...)`) en el `WHERE` (`laboratory.service.ts:691-719`), pero `updateLabRequestItemResult` **no** mueve el ítem a `result_entered` → el paso natural "capturar resultado → validar" queda roto (FND-E2).

### 4.3 Validación, firma y entrega
- `validateItemByTech`: `result_entered|processing` → `validated_tech` (`:691-699`).
- `validateItemByDoctor`: `validated_tech` → `validated_doctor` (`:701-709`).
- `signItem`: `validated_doctor` → `signed` (`:711-719`).
- `deliverItem`: cualquier estado → `delivered`; **transaccional**; si no quedan ítems sin entregar, marca la orden `delivered`+`completed_at` y notifica in-app al paciente tras el `COMMIT` (`:721-772`).
- Entrega pública por token (`lab-result-email.service.ts:129-135`): JWT `scope='lab-result'`, `exp=7d`, firmado HS256 con `JWT_SECRET` (`jwt.service.ts:13,28`); el token lleva `{labRequestId, tenantId, email}`.

### 4.4 Control de calidad y stock
- `recordSampleQC`: estado `failed` → inserta `lab_notifications` `critical` (`:658-676`).
- `createQCRecord`: `status='failed'` → notificación `critical` (`:858-880`).
- `updateReagentStock`: si `current_stock <= min_stock` → notificación `warning` (`:975-993`).
- `getDashboardMetrics`: SLA calculado contra `lab_tests.turnaround_time_min` (breached/at-risk) (`:375-457`).

### 4.5 Eventos en tiempo real
`lab-events.service` emite en canales `"<tenant_id>:<evento>"` sobre un `EventEmitter` (máx. 200 listeners); `handleLabEvents` abre un stream SSE por tenant con `heartbeat` cada 30 s y limpia listeners al cerrar (`laboratory.controller.ts:364-395`).

## 5. Acceso a datos

- Lecturas por `readPool`; escrituras/transacciones por `pool` (RLS activo vía `tagTenantAwarePool`).
- Aislamiento por `tenant_id` en SQL **y** RLS: las 10 tablas `lab_*` están en las listas de `db/security.sql:90-122` (`ENABLE` + `FORCE ROW LEVEL SECURITY` + policy `tenant_isolation`) y de la migración `021:20-42` (con fallback `COALESCE(...,'default')`, ver FND-B2).
- `lab_result_history` **existe y está bajo RLS** (`db/init.sql:773-784`, migración `004:36`) pero **ningún código la escribe ni la lee** → tabla muerta (FND-E4).
- Pools: no se usa `superAdminPool` en este módulo; los "superadmin" siguen leyendo con `pool`/`readPool` (sujetos a RLS).

## 6. Roles de los actores

| Rol | Puede |
|---|---|
| `lab_technician` | Ver órdenes/muestras/QC/equipos/reactivos/notificaciones, registrar resultados, validar por técnico, entregar ítems, dashboards, SSE |
| `doctor` | Crear solicitudes, capturar resultado, validar por médico, firmar, ver historial, (enviar email de resultados) |
| `admin` | Catálogo (tests/áreas/equipos/reactivos/QC), dashboards, gestión general |
| `superadmin` | Igual que admin; su lectura cross-tenant es inconsistente (FND-E6) |
| `user`/`patient` | Ver **sus** solicitudes y descargar PDF de orden; ver resultados por enlace con token |

## 7. Findings de SUB-8 (ver `05-findings.md`, FND-E1…E12)

Destacan: **FND-E1 🔴** (envío de resultados a email arbitrario sin ownership), **FND-E2 🟡** (captura de resultado no avanza estado → validación técnico rota), **FND-E3 🟡** (sin máquina de estados en updates de status), **FND-E4 🟡** (`lab_result_history` muerta), **FND-E5 🟡** (endpoint público por token sin rate limit).

## 8. Notas de NO VERIFICADO

- Efecto real del fallback RLS `'default'` en superadmin (depende de qué fija `tenantMiddleware` para superadmin) — Fase 7.
- Existencia del índice único de `request_number`/`sample_code` y de constraints `sample_code` en el esquema desplegado (Fase 7).
- Cobertura de tests del módulo (no se localizaron pruebas específicas de laboratorio en el barrido inicial) — Fase 11.
- Si el frontend consume SSE (`/events`) con token válido vía `EventSource` (no puede enviar cabecera `Authorization`) — Fase 6.
