# PROGRESS — Auditoría arquitectónica de Vitaria

> **Regla:** leer este archivo (y `README.md`) antes de retomar el trabajo.

## Estado global

- **Etapa actual:** 4 (Diagramas editoriales) — completada
- **Fases:** Fase 0 ✅ · Fase 1 tramo inicial ✅ · **Etapa 2 (subsistemas): SUB-2 ✅ · SUB-3 ✅ · SUB-7 ✅ · SUB-6 ✅ · SUB-8 ✅ · SUB-4 ✅ · SUB-15 ✅ · SUB-11 ✅ · SUB-5 ✅ · SUB-10 ✅ · SUB-9 ✅ · SUB-12 ✅ · SUB-13 ✅ · SUB-14 ✅ · SUB-17 ✅ · SUB-18 ✅ · SUB-16 ✅ · SUB-1 ✅ · SUB-19 ✅** · **Etapa 3 (transversales): 03-dependency-graph ✅ · 04-cross-cutting ✅ · 06-test-coverage ✅ · catálogos symbols/database-access ✅** · **Etapa 4 (visual): 24 diagramas + `index.html` ✅**
- **Última unidad completada:** Etapa 4 — set editorial en `docs/architecture/visual/` (tr-01…tr-05 + sub-01…sub-19 + hub `index.html`)
- **Fecha:** 2026-10-14

## Archivos creados

### Núcleo
- `docs/architecture/README.md`, `PROGRESS.md`, `DECISIONS.md`
- `00-inventory.md` ✅ · `01-system-context.md` ✅ · `02-subsystems.md` ✅ · `03-dependency-graph.md` ✅ · `04-cross-cutting-concerns.md` ✅ · `05-findings.md` ✅ (177 hallazgos) · `06-test-coverage.md` ✅

### Catálogos (`docs/architecture/catalog/`)
- `files.csv` ✅ (610) · `modules.csv` ✅ (57) · `endpoints.csv` ✅ (219: +22 saas, +6 billing, +22 super-admin, +1 currencies, +9 doctor, +4 notifications, +4 attachments, +10 analytics, +4 reports, +2 metrics, +1 audit, +2 export, +4 webhooks, +5 specialties, +1 currencies rates) · `dependencies.csv` ✅ (44 filas) · `symbols.csv` ✅ (1483) · `database-access.csv` ✅ (331)

### SUB-2 Autenticación (`docs/architecture/subsystems/auth/`)
- `overview.md` · `modules.md` · `files.md` · `dependencies.md` · `flows.md` · `diagrams/index.md` ✅ (D1 login, D2 refresh, D3 authMiddleware, D4 frontend)

### SUB-3 Multi-tenancy (`docs/architecture/subsystems/multi-tenancy/`)
- `overview.md` · `modules.md` · `files.md` · `dependencies.md` · `flows.md` · `diagrams/index.md` ✅ (D1 request aislamiento, D2 decisión RLS, D3 pools, D4 tablas/excepciones)

### SUB-7 Historia clínica (`docs/architecture/subsystems/clinical/`)
- `overview.md` · `modules.md` · `files.md` · `dependencies.md` · `flows.md` · `diagrams/index.md` ✅ (D1 módulos/tablas, D2 autorización, D3 crear ficha+hueco, D4 estados)

### SUB-6 Agenda y citas (`docs/architecture/subsystems/booking/`)
- `overview.md` · `modules.md` · `files.md` · `dependencies.md` · `flows.md` · `diagrams/index.md` ✅ (D1 módulos/tablas, D2 validación slot, D3 crear/confirmar/cancelar, D4 ciclo de vida)

### SUB-8 Laboratorio (`docs/architecture/subsystems/laboratory/`)
- `overview.md` · `modules.md` · `files.md` · `dependencies.md` · `flows.md` · `diagrams/index.md` ✅ (D1 módulos/tablas/consumidores, D2 ciclo de vida orden/ítem, D3 captura→validación→firma→entrega, D4 entrega pública por token)

### SUB-4 Seguridad transversal (`docs/architecture/subsystems/security/`)
- `overview.md` · `modules.md` · `files.md` · `dependencies.md` · `flows.md` · `diagrams/index.md` ✅ (D1 cadena de seguridad, D2 CSRF double-submit, D3 validación de entorno/secretos, D4 TOTP AES-256-GCM)

### SUB-15 Base de datos y acceso a datos (`docs/architecture/subsystems/database/`)
- `overview.md` · `modules.md` · `files.md` · `dependencies.md` · `flows.md` · `diagrams/index.md` ✅ (D1 pools/ALS/RLS, D2 familias/relaciones, D3 bootstrap de esquema, D4 drift init.sql vs migraciones)

### SUB-11 Billing / SaaS (`docs/architecture/subsystems/billing/`)
- `overview.md` · `modules.md` · `files.md` · `dependencies.md` · `flows.md` · `diagrams/index.md` ✅ (D1 módulos/tablas, D2 activación de suscripción, D3 ciclo de vida de estados, D4 cobro/reconciliación)

### SUB-5 Usuarios, doctores y pacientes (`docs/architecture/subsystems/users/`)
- `overview.md` · `modules.md` · `files.md` · `dependencies.md` · `flows.md` · `diagrams/index.md` ✅ (D1 módulos/tablas, D2 rutas frontend vs endpoints, D3 alta/invitación, D4 identidad y roles, D5 gestión de usuarios en dos módulos)

### SUB-10 Notificaciones y recordatorios (`docs/architecture/subsystems/notifications/`)
- `overview.md` · `modules.md` · `files.md` · `dependencies.md` · `flows.md` · `diagrams/index.md` ✅ (D1 módulos/jobs/tablas, D2 scope usuario/superadmin, D3 ciclo del recordatorio, D4 cascada temporal)

### SUB-9 Documentos, PDF y adjuntos (`docs/architecture/subsystems/attachments/`)
- `overview.md` · `modules.md` · `files.md` · `dependencies.md` · `flows.md` · `diagrams/index.md` ✅ (D1 módulos/entidades/almacenamiento, D2 ownership anti-IDOR, D3 ciclo de vida del adjunto, D4 rutas PDF y control de acceso)

### SUB-12 Informes, analítica y métricas (`docs/architecture/subsystems/analytics/`)
- `overview.md` · `modules.md` · `files.md` · `dependencies.md` · `flows.md` · `diagrams/index.md` ✅ (D1 módulos y fuentes de datos, D2 pipeline asíncrono de informes, D3 analítica tenant vs cross-tenant, D4 superficie de métricas)

### SUB-13 Auditoría e integridad (`docs/architecture/subsystems/audit/`)
- `overview.md` · `modules.md` · `files.md` · `dependencies.md` · `flows.md` · `diagrams/index.md` ✅ (D1 escritores de `audit_logs`, D2 RLS/policies, D3 cadena HMAC escritura vs verificación, D4 superficie de lectura + cron)

### SUB-14 Portabilidad de datos y webhooks (`docs/architecture/subsystems/data-portability/`)
- `overview.md` · `modules.md` · `files.md` · `dependencies.md` · `flows.md` · `diagrams/index.md` ✅ (D1 módulos/rutas/tablas, D2 pipeline de webhooks con puntos muertos, D3 SSRF/secreto, D4 export RGPD)

### SUB-17 Especialidades y catálogos (`docs/architecture/subsystems/specialties/`)
- `overview.md` · `modules.md` · `files.md` · `dependencies.md` · `flows.md` · `diagrams/index.md` ✅ (D1 módulos/rutas/tablas, D2 resolución de tenant en rutas públicas, D3 ciclo de especialidad, D4 tasas de cambio)

### SUB-18 Semillas y arranque de datos (`docs/architecture/subsystems/seeds/`)
- `overview.md` · `modules.md` · `files.md` · `dependencies.md` · `flows.md` · `diagrams/index.md` ✅ (D1 orquestación de arranque, D2 credenciales de seed, D3 ciclo idempotente, D4 DDL en runtime)

### SUB-16 Infraestructura y observabilidad (`docs/architecture/subsystems/infrastructure/`)
- `overview.md` · `modules.md` · `files.md` · `dependencies.md` · `flows.md` · `diagrams/index.md` ✅ (D1 topologías de deploy, D2 pipeline CI, D3 observabilidad/mantenimiento, D4 backup diario)

### SUB-1 SPA frontend (`docs/architecture/subsystems/frontend/`)
- `overview.md` · `modules.md` · `files.md` · `dependencies.md` · `flows.md` · `diagrams/index.md` ✅ (D1 providers/árbol, D2 request+refresh, D3 guardas rol/plan, D4 sesión multi-pestaña y logout)

### SUB-19 Onboarding público, aplicaciones y legal (`docs/architecture/subsystems/onboarding/`)
- `overview.md` · `modules.md` · `files.md` · `dependencies.md` · `flows.md` · `diagrams/index.md` ✅ (D1 módulos/rutas/tablas, D2 alta transaccional, D3 ciclo de solicitud vs acceso, D4 carga de documentos base64)

### Etapa 3 — Transversales (`docs/architecture/`)
- `03-dependency-graph.md` ✅ (grafo de arranque, 134 aristas módulo→módulo, hubs, externos, contratos HTTP, resumen de acceso a datos)
- `04-cross-cutting-concerns.md` ✅ (logging, errores, validación, saneamiento, i18n, fechas/tz, config, observabilidad, multi-tenancy, convenciones de API)
- `06-test-coverage.md` ✅ (matriz subsistema→tests, 299 archivos de test, gaps G1–G7)
- `catalog/symbols.csv` ✅ (1483 símbolos exportados) · `catalog/database-access.csv` ✅ (331 accesos archivo→tabla→operación)

## Subsistemas

| ID | Subsistema | Estado |
|---|---|---|
| SUB-2 | Autenticación y sesiones | ✅ completado |
| SUB-3 | Autorización / multi-tenancy / RLS | ✅ completado |
| SUB-5 | Usuarios, doctores y pacientes | ✅ completado |
| SUB-6 | Agenda y citas | ✅ completado |
| SUB-7 | Historia clínica y fichas (PHI) | ✅ completado |
| SUB-8 | Laboratorio | ✅ completado |
| SUB-4 | Seguridad transversal | ✅ completado |
| SUB-15 | Base de datos y acceso a datos | ✅ completado |
| SUB-11 | Billing / SaaS | ✅ completado |
| SUB-10 | Notificaciones y recordatorios | ✅ completado |
| SUB-9 | Documentos, PDF y adjuntos | ✅ completado |
| SUB-12 | Informes, analítica y métricas | ✅ completado |
| SUB-13 | Auditoría e integridad | ✅ completado |
| SUB-14 | Portabilidad de datos y webhooks | ✅ completado |
| SUB-17 | Especialidades y catálogos | ✅ completado |
| SUB-18 | Semillas y arranque de datos | ✅ completado |
| SUB-16 | Infraestructura y observabilidad | ✅ completado |
| SUB-1 | SPA frontend (React 19) | ✅ completado |
| SUB-19 | Onboarding público, aplicaciones y legal | ✅ completado |

## Diagramas

- Generados: **80** — contexto (01) + subsistemas (02) + auth D1-D4 (4) + multi-tenancy D1-D4 (4) + clinical D1-D4 (4) + booking D1-D4 (4) + laboratory D1-D4 (4) + security D1-D4 (4) + database D1-D4 (4) + billing D1-D4 (4) + users D1-D5 (5) + notifications D1-D4 (4) + attachments D1-D4 (4) + analytics D1-D4 (4) + audit D1-D4 (4) + data-portability D1-D4 (4) + specialties D1-D4 (4) + seeds D1-D4 (4) + infrastructure D1-D4 (4) + frontend D1-D4 (4) + onboarding D1-D4 (4) + grafo de dependencias (03).

### Etapa 4 — set editorial (`docs/architecture/visual/`, 25 HTML)

- **Transversales:** `tr-01-system-overview.html` · `tr-02-request-lifecycle.html` · `tr-03-risk-quadrant.html` · `tr-04-dependency-graph.html` · `tr-05-test-coverage.html`
- **Subsistemas:** `sub-01-frontend.html` · `sub-02-auth.html` · `sub-03-multitenancy.html` · `sub-04-security.html` · `sub-05-users.html` · `sub-06-booking.html` · `sub-07-clinical.html` · `sub-08-laboratory.html` · `sub-09-attachments.html` · `sub-10-notifications.html` · `sub-11-billing.html` · `sub-12-analytics.html` · `sub-13-audit.html` · `sub-14-portability.html` · `sub-15-database.html` · `sub-16-infrastructure.html` · `sub-17-specialties.html` · `sub-18-seeds.html` · `sub-19-onboarding.html`
- **Hub:** `index.html` (navegación) · **Recibo de marca:** `_brand-tokens.md`
- **Marca:** perfil local `vitaria` + marker `.diagram-design` · paleta `#f6f8fb` / accent `#0d9488` · Instrument Serif + Plus Jakarta Sans + Geist Mono

## Hallazgos confirmados (177)

**SUB-2:** FND-A1 🔴 (lockout no persiste), A2 (JWKS vacío), A3 (secreto HMAC compartido), A4 (política password ×3), A6 (`optionalAuth` sin validar sesión), A8 (auth.service 962L).
**SUB-3:** FND-B1 🔴 (7 tablas con fuga cross-tenant conocida), B2 (RLS fail-open a 'default'), B3 (rutas públicas en 'default'), B4 (`tenants` USING true), B5 (migración 021 debilita escritura SaaS), B6 (lockouts no auditados), B7 (`DEFAULT_TENANT_ID` acoplado), B8 (N+1 en features).
**SUB-7:** FND-C1 🟡 (create ficha sin relación médico-paciente), C2 (superadmin PHI limitado a 'default'), C3 (booking cancelada da relación), C4 (listado no excluye canceladas), C5 (PII rut/email expuesta), C6 (SQL duplicado), C7 (medical-history sin sanitizar), C8 (plantillas sin ownership), C9 (sin máquina de estados), C10 (schemas inline).
**SUB-6:** FND-D1 🔴 (recordatorios solo tenant 'default'), D2 (flujo confirmar cita muerto), D3 (`confirmed`↔`status` desalineados), D4 (PHI pública por RUT), D5 (token sin tenant_id), D6 (dos cancelaciones divergentes), D7 (SET TRANSACTION sin BEGIN), D8 (feriado from_status fijo + waitlist sin hueco), D9 (superadmin limitado a 'default'), D10 (historial from==to), D11 (SELECT antes de BEGIN), D12 (availability /:id público), D13 (ICS UTC + RUT), D14 (filtro tautológico recordatorios), D15 (DELETE guest sin limiter).
**SUB-8:** FND-E1 🔴 (resultados a email arbitrario sin ownership), E2 (capturar resultado no avanza estado → validación técnico rota), E3 (sin máquina de estados ni validación de entrada en status), E4 (`lab_result_history` muerta + delta invertido), E5 (token público sin rate limit), E6 (superadmin cross-tenant inconsistente), E7 (vínculos sin verificar pertenencia), E8 (analytics placeholder), E9 (delta hardcodeado ignora `delta_check_pct`), E10 (borrado físico con CASCADE), E11 (ruta permite admin pero controller exige doctor), E12 (cancelación paciente muerta en ruta).
**SUB-4:** FND-F1 🟡 (reCAPTCHA verificado en login/onboard pero NO en register), F2 (bypass CSRF sin cookie previa), F3 (sanitización de entrada inconsistente entre módulos), F4 (CSP mejorable/`frameSrc` incompleto), F5 (rate limiters en memoria por instancia), F6 (`trust proxy`/clave de limiter), F7 (`errorHandler` propaga mensajes 4xx).
**SUB-15:** FND-G1 🟡 (doble fuente de esquema init.sql vs migraciones), G2 (`DEFAULT 'default'` masivo + `users.tenant_id` nullable), G3 (FKs ausentes/series_id), G4 (`jobs` sin tenant), G5 (CHECK no inmutable), G6 (`ml_demand_forecast` sin uso), G7 (índices duplicados históricos), G8 (3 round-trips por query), G9 (fallback silencioso de pools), G10 (CASCADE sobre PHI).
**SUB-11:** FND-H1 🟡 (checkout MVP activa plan de pago sin pago), H2 (changePlan factura `paid` sin cobro), H3 (flujo de gracia `past_due` inalcanzable), H4 (webhook MercadoPago sin verificación de firma), H5 (idempotencia de facturas en memoria), H6 (`updateInvoiceStatus` sin máquina de estados/`paid_at`), H7 (importes sin revalidar), H8 (advisory lock sobre-serializa), H9 (onboarding sin suscripción silencioso), H10 (stats de facturación global a doctores), H11 (borrado físico de facturas), H12 (tasas de cambio estáticas), H13 (N+1 en `getTenantFeatures`), H14 (`/saas/features` sin control de rol).
**SUB-5:** FND-I1 🔴 (enlace de bienvenida del doctor sin consumidor → onboarding roto), I2 (invitación de doctor por id → 404), I3 (`GET /doctors/:id|/stats|/schedule` → 404, service muerto), I4 (validación email/RUT global en `registerDoctor`), I5 (`/doctors/users` expone todos los usuarios del tenant a doctores), I6 (listado de pacientes: 2 queries + filtro/paginación en cliente), I7 (`createDoctorSchema` con campos ignorados), I8 (`updateDoctorSchema` solo name/specialty), I9 (`toggleUserActive` super-admin acotado a `req.tenant_id`), I10 (gestión de usuarios duplicada; sin endpoints de paciente), I11 (especialidad de doctor no validada contra `specialties`), I12 (disponibilidad fija 09:00-17:00 sembrada). Resuelto FND-A7 (tenant_id en `register` → confirmado).
**SUB-10:** FND-J1 🟢 (`markAllAsRead` ignora scope `allUsers`), J2 (cron de recordatorios sin lock distribuido → doble envío multi-instancia), J3 [RESUELTO/DESCARTADO: `audit-integrity.job` **sí** está programado cada 6h; ver FND-M1]), J4 (recordatorios no crean notificación in-app), J5 (`createNotification` no valida user↔tenant).
**SUB-9:** FND-K1 🟡 (límite real de subida ~75 KB por `express.json` 100 KB, no 10 MB), K2 (sin validación de contenido/magic-bytes + try/catch muerto en base64), K3 (almacenamiento en FS local efímero), K4 (listado de adjuntos sin paginación), K5 (descarga sin `nosniff` e `inline` con mime del cliente).
**SUB-12:** FND-L1 🔴 (`/metrics` público si `METRICS_TOKEN` no está definido; montado antes de auth y del rate limiter), L2 (join `b.doctor_id = d.user_id` incorrecto en informe de citas), L3 (join `lr.doctor_id = u.id` incorrecto en informe de laboratorio), L4 (analítica fabrica datos con `Math.random()`; "ML"/forecast no reales), L5 (`total_patients` sólo `role='user'`), L6 (`/reports/:id/pdf` no usado; lógica duplicada con CSV cliente), L7 (`result_url` guarda JSON y `JSON.parse` sin try/catch), L8 (informe de pacientes incluye 0 citas), L9 (reporte queda `generating` si falta el worker), L10 (rangos `months`/`days`/`limit` sin cota).
**SUB-13:** FND-M1 🔴 (cadena HMAC de `audit_logs` no funcional: triggers insertan sin hash + `logAction` muerta + canonical del verificador distinta → siempre `brokenLinks>0`), M2 🔴 (`user_id` siempre `NULL` → sin atribución de actor), M3 🟡 (INSERT en `users` no se audita), M4 🟡 (encadenado global vs verificación por tenant, sin lock), M5 🟢 (`logAction` código muerto), M6 🟢 (`GET /api/audit` sin metadatos de paginación), M7 🟢 (`hashToken` acoplado a `AUDIT_HMAC_SECRET`), M8 🟢 (`audit_logs` sin inmutabilidad/append-only a nivel tabla).
**SUB-14:** FND-N1 🔴 (`dispatchEvent` sin invocadores → webhooks nunca disparan), N2 🟡 (secreto de webhook en texto plano), N3 🟡 (SSRF por redirecciones/sin validar IP resuelta), N4 🟡 (export RGPD sin borrado ni auditoría de PHI), N5 🟡 (`webhook_deliveries` nunca escrita), N6 🟢 (export en memoria/síncrono), N7 🟢 (sin rotación de secreto), N8 🟢 (`/export/patients/:id` no valida que sea paciente), N9 🟢 (drift init.sql vs migración 017).
**SUB-17:** FND-O1 🟡 (`GET /api/specialties` público filtra por `X-Tenant-Id` y expone emails de doctores cross-tenant), O2 🟢 (listado sin paginación; frontend simula), O3 🟢 ("no encontrado" → 400 en vez de 404), O4 🟢 (`tenant_id` en body muerto para admin), O5 🟢 (create "get-or-create" no devuelve 409), O6 🟢 (tasas con fallback hardcodeado y `updatedAt` nulo).
**SUB-18:** FND-P1 🟡 (credenciales de seed predecibles + `DemoVitaria2026!` hardcodeado), P2 🟡 (tenants de demo con datos completos), P3 🟡 (DDL en runtime + constraint `check_future_date` desactivada), P4 🟢 (`seed()` no transaccional con `catch {}`), P5 🟢 (`spreadSeedDates` sin filtro de tenant), P6 🟢 (variables de arranque no documentadas).
**SUB-16:** FND-Q1 🟡 (`COPY frontend/dist ... || true` inválido en Dockerfile), Q2 🟡 (`render.yaml` plan free + secretos ausentes → `/metrics` desprotegido), Q3 🟡 (`.env.example` incompleto), Q4 🟢 (leads comerciales versionados en `scripts/`), Q5 🟢 (alertas sin persistencia/ruta), Q6 🟢 (`/metrics` 3 queries por scrape sin caché).
**SUB-1:** FND-R11 🔴 (flujo 2FA del login roto: backend nunca devuelve `requires_2fa`, lanza 400 `AUTH_2FA_REQUIRED`; `/2fa` inalcanzable — resuelve FND-A5), R1 🟡 (credenciales demo hardcodeadas y visibles en UI/bundle), R2 🟡 (`src/test` excluido del type-check), R3 🟡 (`npm run lint` sin ESLint y CI no lo ejecuta), R4 🟡 (sin reporte de errores frontend ni ErrorBoundary por ruta), R5 🟢 (componentes sobredimensionados), R6 🟢 (`getRoleColor` con hex fuera del tema), R7 🟢 (27 estilos inline), R8 🟢 (`auth_user` localStorage muerto), R9 🟢 (import i18n relativo `.js` en error-sanitizer), R10 🟢 (umbrales de cobertura frontend < backend).
**SUB-19:** FND-S1 🔴 (alta pública autoprovisiona el plan como `active` y factura `paid` sin cobro), S2 🔴 (aprobar es no-op y rechazar NO desactiva el tenant → acceso de solicitudes rechazadas), S3 🟡 (alta sin verificación/notificación por email; admin activo de inmediato), S4 🟡 (documentos de onboarding limitados por `express.json` 100 KB, no por `MAX_FILE_BYTES`), S5 🟡 (`verifyCaptchaOnboard` falla-abierto sin secret o con TEST key), S6 🟢 (paginación del panel superadmin inalcanzable), S7 🟢 (precios de landing hardcodeados, desacoplados del catálogo), S8 🟢 (`operating_hours` con shape inconsistente), S9 🟢 (enlaces muertos `href="#"` y anclas que recargan la SPA), S10 🟢 (código/artefactos vestigiales: `listDocuments`, `landing-vitaria.html`), S11 🟢 (dos algoritmos de completitud frontend/backend distintos).
**Transversales:** FND-T1 🟡 (139/219 endpoints sin validación Zod), T2 🟡 (logs `info` solo a ficheros locales efímeros), T3 🟡 (i18n backend es/en vs UI 4 idiomas; `pt` deprecado/`fr` ausente), T4 🟢 (sin manejo de zona horaria pese a `tenants.timezone`), T5 🟢 (sin módulo de config central ni validación de esquema de env), T6 🟢 (envelope de éxito/paginación no uniforme).

## Preguntas sin resolver

1. ~~¿Dónde viven CRUD de usuarios y pacientes?~~ → **resuelto (SUB-5):** no existen módulos `users`/`patients`; identidad en `users` (rol), CRUD disperso en `doctor` (tenant) y `super-admin` (global); pacientes = `users` con `role IN ('user','patient')`.
2. ~~¿Twilio / SendGrid implementados?~~ → SendGrid **sí** (`email.service.ts`); Twilio **no**. (A10/A11 resueltos)
3. ¿Existe subsistema ML real?
4. ¿Landing desplegada?
5. ¿Estado real de RLS en producción y de `clinic_superadmin`?

> **Corrección de auditoría:** los hallazgos FND-F1 y FND-F3 se reescribieron al detectarse un `grep` no recursivo que dio falsos negativos. Captcha y sanitización **sí** existen.
> **Corrección de auditoría:** FND-J3 se descartó al comprobarse en SUB-13 que `verifyAuditChain` **sí** se programa como cron cada 6h (`app.ts:517-529`).

## Problemas de herramientas

- **`diagram-design` (skill local) reutilizado** → el set editorial de `visual/` se dibuja con el skill local (`07_Documentacion/diagramas/diagram-design`); los `diagrams/index.md` de los subsistemas siguen en **Mermaid** (D-1). Chrome DevTools no conecta → sin verificación visual por captura.

## Diagramas editoriales (`docs/architecture/visual/`)

- **Estado:** completado. **25 archivos HTML** (24 diagramas + `index.html` hub de navegación).
- **Marca:** perfil local `vitaria` (`~/.diagram-design/profiles/vitaria.md`) + marker `.diagram-design` (`profile: vitaria`) en la raíz del repo. Paleta cool paper `#f6f8fb`, accent `#0d9488`, tipografías Instrument Serif + Plus Jakarta Sans + Geist Mono.
- **Transversales:** `tr-01-system-overview` · `tr-02-request-lifecycle` · `tr-03-risk-quadrant` · `tr-04-dependency-graph` · `tr-05-test-coverage`.
- **Subsistemas:** `sub-01-frontend` … `sub-19-onboarding` (19 archivos).
- **Validación:** los 24 diagramas pasan `self_check.py` (exit 0), `verify-geometry.py` (0 findings) y `lint-skin.py` sin hallazgos a11y. `index.html` es un hub sin SVG de diagrama (self_check N/A por diseño). Los avisos de paleta de `lint-skin.py` son esperados: compara contra el `style-guide.md` instalado, no contra el perfil.
- **Nota de datos:** `tr-05` refleja **inventario estático** (299 archivos de test); la cobertura real sigue **NO VERIFICADA**.

## Próxima tarea exacta

**AUDITORÍA CERRADA + set visual CERRADO.** Etapa 2 (19 subsistemas SUB-1…SUB-19), Etapa 3 (transversales: `03-dependency-graph.md`, `04-cross-cutting-concerns.md`, `06-test-coverage.md`, `catalog/symbols.csv`, `catalog/database-access.csv`) y Etapa 4 (24 diagramas editoriales en `visual/`) completadas. Queda únicamente el trabajo de **verificación de campo** (§ «Preguntas sin resolver»): ejecutar `npm test` en backend/frontend, confirmar estado real de RLS/Render/secretos. No quedan fases de documentación pendientes.
