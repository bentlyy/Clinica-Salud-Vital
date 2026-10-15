# 04 — Preocupaciones transversales (cross-cutting concerns)

> **Estado:** ✅ completado · **Ámbito:** log, errores, validación, saneamiento, i18n, fechas, config, observabilidad, multi-tenancy, seguridad y convenciones de API.
> **Certeza:** confirmado salvo indicación. Evidencia `ruta:línea`.

## 1. Logging

| Aspecto | Implementación | Evidencia |
|---|---|---|
| Librería | `winston` (JSON en prod, colorizado en dev) | `src/utils/logger.ts:11-17` |
| Niveles | `LOG_LEVEL` (default `info`) | `src/utils/logger.ts:22` |
| Transportes | `Console` + `logs/error.log` (nivel error, 10 MB×5) + `logs/combined.log` (10 MB×5) | `src/utils/logger.ts:24-39` |
| Correlación | UUID en cabecera `X-Request-ID` (reutiliza el entrante), devuelto en respuesta | `src/middlewares/correlationId.middleware.ts:6-13` |
| Acceso HTTP | `requestLogger` loguea `method path status - Nms` + body redactado; nivel por status (≥500 error, ≥400 warn, resto info) | `src/middlewares/requestLogger.middleware.ts:8-21` |
| Uso | 36 archivos importan `utils/logger` | `symbols.csv` / grep |

**Observaciones AS-IS:**
- El `requestId` se propaga a errores y alertas (`errorHandler.middleware.ts:15,18,25`), pero **no** se inyecta en los logs de negocio (services) ni en `logger` como contexto global.
- `LOG_DIR` default `logs` escribe **en el sistema de archivos local** (`logger.ts:19`): en un contenedor/render efímero esos ficheros se pierden al reiniciar (ver `subsystems/infrastructure`). Sin transporte externo (p.ej. Sentry/Logtail) para logs de nivel `info`.

## 2. Manejo de errores

| Pieza | Descripción | Evidencia |
|---|---|---|
| Jerarquía | `AppError` (statusCode + `code`) y subclases `BadRequestError/NotFoundError/UnauthorizedError/ForbiddenError` con resolución de mensaje por `ErrorCode` | `src/utils/errors.ts:3-58` |
| Catálogo de códigos | `ERROR_MESSAGES` + tipo `ErrorCode` (mensajes i18n-ready) | `src/utils/error-codes.ts` |
| Manejador global | `errorHandler`: loguea, en 5xx dispara `notifyCritical`, **enmascara** el mensaje a `Internal server error` fuera de dev | `src/middlewares/errorHandler.middleware.ts:8-35` |
| 404 | `notFoundHandler` → `NotFoundError('Route not found')` | `errorHandler.middleware.ts:37-40` |
| Envoltorio async | `asyncHandler` evita `try/catch` por handler | `src/middlewares/asyncHandler.middleware.ts:3` |
| Conversión segura | `toError(unknown)` normaliza valores lanzados | `errors.ts:64-70` |

**Forma de respuesta de error:** `{ error: string, code?: string }` (`errorHandler.middleware.ts:31-34`). **No** hay envelope uniforme de éxito (cada módulo devuelve su propio JSON/paginado).

## 3. Validación de entrada

- Zod + middleware `validateZod(schema, source)` con `source ∈ {body,params,query}`; reemplaza el dato original por el parseado (`src/middlewares/validate.middleware.ts:8-29`).
- En producción el detalle de los issues se oculta y se loguea (`:19-24`).
- **Cobertura real:** `catalog/endpoints.csv` → **80 de 219 endpoints** tienen `validation != none` (**139 sin validación Zod declarada**). Es la mayor brecha transversal (ver `05-findings.md`).

## 4. Saneamiento y redacción de datos sensibles

| Función | Uso | Evidencia |
|---|---|---|
| `sanitizeText` / `sanitizeTextStrict` (strip total de HTML) | limpieza de texto libre | `src/shared/sanitize.ts:3-24` |
| `stripSensitiveFields` | redacta `password`, PHI (`diagnosis`, `vital_signs`, `lab_results`…), PII (`rut`,`email`,`phone`) a `[REDACTED]` recursivo | `sanitize.ts:37-64` |
| `escapeHtml` | escapado manual para HTML (emails/plantillas) | `src/shared/escape.ts:1-9` |
| `hpp` | mitigación de HTTP Parameter Pollution | `src/app.ts` (bootstrap) |

`stripSensitiveFields` se aplica **solo al body logueado** (`requestLogger.middleware.ts:10`), no a la persistencia.

## 5. Internacionalización (i18n)

Existen **dos sistemas i18n independientes y desconectados**:

| | Backend | Frontend |
|---|---|---|
| Archivo | `src/shared/i18n.service.ts` | `frontend/src/i18n/i18n.ts` + `locales/{es,en,fr,pt}.json` |
| Librería | diccionario propio `t()` | `i18next` + `react-i18next` |
| Locales | `Locale = 'es' \| 'en'`; `pt` presente pero marcado **DEPRECADO**; comentario menciona `fr` "copia de es" | 4 idiomas, **3751 claves idénticas** (SUB-1) |
| Uso | plantillas de email/notificaciones | UI |

**Hallazgo transversal:** `src/shared/i18n.service.ts:3-5` documenta que `pt`/`fr` están incompletos y `fr` es una copia de `es`; `:951-952` marca `pt` como deprecado. La UI ofrece 4 idiomas mientras el backend de emails maneja 2 reales → **inconsistencia de idioma entre email y UI**. (Complementa FND-I* de notificaciones.)

## 6. Fechas, horas y zona horaria

- Utilidades mínimas: `getDayOfWeek`, `isValidDate` (`YYYY-MM-DD`), `isValidTime` (`HH:MM`) — **sin** librería de tz ni manejo de DST (`src/shared/date.ts:1-9`).
- El modelo tiene `tenants.timezone` y `plans`/`tenant_onboarding` exponen zona horaria (ver SUB-19), pero el cálculo de recordatorios/citas usa cadenas locales sin conversión de tz explícita (ver `subsystems/notifications`, `subsystems/booking`). **Riesgo** para tenants multi-país.

## 7. Configuración y variables de entorno

- Carga vía `dotenv` en el bootstrap; acceso directo `process.env.*` disperso (sin módulo `config` central — `src/config/` **no existe**).
- `validateEnvSecurity()` valida al arranque: `JWT_SECRET` (definido, ≠ default, ≥32), `COOKIE_SECRET` (definido, ≥32, ≠ JWT_SECRET), `AUDIT_HMAC_SECRET` (definido, ≥32), `ENCRYPTION_KEY` (warn si falta/&lt;16), `DATABASE_URL` (definido) (`src/middlewares/security.middleware.ts:58-121`).
- **No** hay validación de esquema (Zod) del conjunto completo de env; `.env.example` está incompleto (FND-Q3).
- `NODE_ENV` gobierna: formato de log, enmascarado de errores, `secure` de cookies CSRF (`csrf.middleware.ts:16`), headers de seguridad (`security.middleware.ts:7`).

## 8. Observabilidad

| Señal | Implementación | Evidencia |
|---|---|---|
| Métricas | `prom-client`; `httpRequestsTotal`, `httpRequestDurationSeconds`; `metricsMiddleware` con `normalizePath` (evita cardinalidad alta) | `src/middlewares/metrics.middleware.ts:1-31` |
| Exposición | `GET /metrics` y `GET /api/metrics` (protegidos por `METRICS_TOKEN` — ver SUB-12) | `src/app.ts:141-142` |
| Health | `GET /health` (readiness con DB) + `GET /health/live` (liveness); alias `/api/...` | `src/app.ts:75,128,136-139` |
| Error tracking | `@sentry/node` (`src/shared/sentry.service.ts`) — **solo backend** | `dependencies.csv` |
| Alertas | `notifyCritical` en errores 5xx y dead-letter de cola | `errorHandler.middleware.ts:19`, `alerts.service.ts` |

`metricsMiddleware` **salta** health/metrics (`metrics.middleware.ts:4-17`).

## 9. Multi-tenancy (contexto transversal)

- `AsyncLocalStorage` (`tenantContext`) propaga `tenant_id` a lo largo de la request (`src/shared/db.ts:2`, usado por `tenant.middleware.ts:42`).
- `tenantMiddleware` resuelve el tenant (subdominio/header) y lo inyecta; rutas públicas exentas vía `PUBLIC_PATH` (`tenant.middleware.ts:29`).
- RLS en Postgres refuerza el aislamiento a nivel BD (ver `subsystems/multi-tenancy`). Detalle de fugas por rol en FND-B*.

## 10. Seguridad de peticiones (resumen transversal)

Orden de la cadena en `src/app.ts`: `helmet` + seguridad → `compression` → CORS → estáticos/SPA → `cookieParser` → `express.json({limit:'100kb'})` → `csrfProtection` → `optionalAuth` → `tenantMiddleware` → `trackActivity` → `correlationId`/`requestLogger`/`metrics` → rate limiters (global/auth/session). Detalle y hallazgos en `subsystems/security` y `05-findings.md`.

- CSRF: doble-submit con cookie `csrf_token` (`csrf.middleware.ts`).
- Rate limiting: **26 de 219** rutas con limiter explícito (`endpoints.csv`).

## 11. Convenciones de API

- Prefijo global `/api` (`app.ts`).
- **Auth:** 194 de 219 endpoints requieren autenticación; 25 públicos (`endpoints.csv`).
- **Autorización por rol:** middleware `authorize(...roles)` (`auth.middleware.ts:153`); endpoints sin `authorize` dependen de ownership/tenant.
- **Paginación:** no uniforme — cada módulo define `page`/`limit` (o no pagina). Ver FND-M6 (`GET /audit-logs` sin paginación) y FND-O2.
- **Envelope de respuesta:** sin estándar; errores sí usan `{error,code}`.

## 12. Deuda transversal (síntesis)

| # | Concern | Deuda | Ref |
|---|---|---|---|
| T1 | Validación | 139/219 endpoints sin Zod | `endpoints.csv` |
| T2 | Logs | ficheros locales efímeros; sin transporte externo de `info` | `logger.ts:19` |
| T3 | i18n | backend es/en vs UI es/en/fr/pt; `pt` deprecado, `fr` copia | `i18n.service.ts:3-5,951` |
| T4 | Fechas/tz | sin manejo de zona horaria pese a `tenants.timezone` | `date.ts` |
| T5 | Config | sin módulo `config` central ni validación de esquema de env | `src/` |
| T6 | Envelope | sin formato de respuesta uniforme de éxito/paginación | varios |
| T7 | Error tracking | frontend sin Sentry/ErrorBoundary por ruta | FND-R4 |

## 13. NO VERIFICADO

- Si `LOG_DIR` apunta a disco persistente en producción.
- Si `METRICS_TOKEN`/`SENTRY_DSN` están configurados en Render.
- Cobertura real de validación (el CSV refleja `validateZod` estático; puede haber validación manual adicional).

---

> Tags: #transversal #logging #errores #i18n #seguridad · Ver: [`03-dependency-graph.md`](03-dependency-graph.md) · [`05-findings.md`](05-findings.md)
