---
titulo: Auditoría técnica con herramientas (SAST/SCA/RLS/CodeQL)
fecha: 2026-10-13
autor: Auditoría asistida (opencode)
estado: hallazgos confirmados con evidencia
score_estimado: 62/100
tags:
  - auditoria
  - seguridad
  - sast
  - sca
  - rls
  - multi-tenant
  - codeql
  - semgrep
  - trivy
---

# 🛡️ Auditoría con herramientas — Vitaria (2026-10-13)

> Alcance: auditoría **estática + dinámica de RLS** sobre el código y una **base de datos de auditoría aislada**. No se tocó producción. Ver [[system-summary]] y [[audit-2026-10-09]] para contexto previo.

## 1. Metodología y entorno

| Fase | Descripción | Resultado |
|------|-------------|-----------|
| A | Reconocimiento de entorno | OK |
| B | Instalación de herramientas (Semgrep, Trivy, PostgreSQL audit, CodeQL) | OK |
| C | Escaneo estático (SAST + SCA + IaC + secretos) y auditoría de esquema/RLS | OK |
| D | Prueba dinámica de aislamiento RLS (2 tenants, datos reales) | **FALLA** (fuga confirmada) |
| E | Escaneo profundo CodeQL (JS/TS, `security-extended`) | OK |

### Herramientas

| Herramienta | Versión | Uso |
|-------------|---------|-----|
| Semgrep | 1.180.0 | SAST OWASP/nodejsscan/typescript/secrets |
| Trivy | 0.75.0 | SCA + secretos + misconfig (Dockerfile) |
| CodeQL | 2.27.2 | Análisis de flujo (JS/TS `security-extended`, 105 queries) |
| PostgreSQL | 15.19 | BD de auditoría aislada (`127.0.0.1:55432`, clúster propio) |
| Rol de auditoría | `audit_ro` | `NOSUPERUSER`, `NOBYPASSRLS`, solo `SELECT` |

> La BD de auditoría se reconstruyó desde `db/init.sql` (49 tablas) + 31 migraciones + `db/security.sql`. Contiene **datos sintéticos** de dos clínicas (`ci-alpha`, `ci-beta`).

---

## 2. Hallazgos confirmados

Criticidad: 🔴 Alta · 🟡 Media · 🟢 Baja

| Criticidad | Categoría | Descripción | Evidencia (archivo:línea) | Recomendación |
|---|---|---|---|---|
| 🔴 Alta | Multi-tenant/RLS | **8 tablas filtran filas de otros tenants** (ver §3). 4 sin RLS y 4 con `authenticated_read USING(true)` | pruebas dinámicas §3 | `ENABLE/FORCE RLS` + política `tenant_isolation`; endurecer `authenticated_read` por `tenant_id` |
| 🔴 Alta | SCA | `proxy-addr` 2.0.7 — **CRITICAL** CVE-2026-90711 (IP spoofing IPv4-mapped IPv6). Afecta `trust proxy`/rate-limit/tenant por `X-Forwarded-For` | `package-lock.json` (→2.0.8) | Bump `proxy-addr@2.0.8` |
| 🔴 Alta | SCA | `axios` 1.18.1 — **7 HIGH** (SSRF por redirects, hijacking de socket, DoS×4, prototype pollution) | `frontend/package-lock.json` (→1.20.0) | Bump `axios@1.20.0` |
| 🔴 Alta | Cifrado PHI | `PHI_MASTER_KEY` declarada en `.env.example` pero **sin uso** en `src/` → sin cifrado de PHI a nivel app | `rg PHI_MASTER_KEY src` = 0 resultados | Implementar cifrado o eliminar la variable/documentar |
| 🔴 Alta | Path injection | Rutas de fichero derivadas de `tenantId` (cabecera) y datos de usuario en descargas/borrados | `attachments.service.ts:192,196,274`; `attachments.controller.ts:50,53` | Validar/normalizar `tenantId` y `storage`; confinar a `UPLOAD_ROOT` |
| 🟡 Media | Multi-tenant | `X-Tenant-Id` **sin validar** se usa como `tenant_id` en rutas públicas desconocidas | `tenant.middleware.ts:80,82` | Rechazar tenants inexistentes también en rutas públicas; validar formato de tenant |
| 🟡 Media | PHI en URL | PHI (patient_id médica) como **query param GET** → queda en logs/historial | `clinical-record.controller.ts:12,99`; `medical-history.controller.ts:21,47`; `data-portability.controller.ts:12` | Mover a POST/body o IDs opacos; no loguear query strings |
| 🟡 Media | Rate limiting | Rutas de `/health`, estáticos y `optionalAuth` sin rate-limit (registradas antes del `globalLimiter`) | `app.ts:136,137,175,189` | Aplicar limiter también a health/estáticos |
| 🟡 Media | Auth | Condición sensible influida por entrada del usuario (revisar 3 casos) | `auth.middleware.ts:139`; `auth.service.ts:144,348` | Validar manualmente (ver §5 FPs) |
| 🟡 Media | Crypto | AES-GCM sin `authTagLength` explícito | `crypto.service.ts:53` | Fijar `authTagLength: 16` |
| 🟡 Media | SCA | `nodemailer` 9.1.1 (1 HIGH + 3 MEDIUM, DoS en `addressparser`) | `package-lock.json` (→10.0.x) | Bump `nodemailer@10` |
| 🟡 Media | SCA | `compression` 1.8.1 HIGH; `source-map-js` 1.2.1 HIGH | `package-lock.json` | Bump `compression@1.8.2`, `source-map-js@1.2.2` |
| 🟡 Media | Secretos en logs | Tokens JWT escritos en `logs/combined.log` (4×) | Trivy `logs/combined.log:19316-19321` | Redactar tokens/sensibles en el logger |
| 🟡 Media | Rendimiento | Tablas con `tenant_id` sin índice líder → full scan con RLS | `clinical_records`, `doctor_availability`, `doctor_exceptions`, `onboarding_documents` | Índices `(tenant_id, …)` |
| 🟡 Media | ReDoS | Regex con entrada de usuario con backtracking polinómico | `auth.service.ts:137`; `doctor.service.ts:68,261` | Acotar regex / validar longitud |
| 🟢 Baja | Log injection | Valores de usuario interpolados en logs (16 casos) | `requestLogger.middleware.ts:15-19`; `saas.*`; `email.service.ts:148`; etc. | Sanitizar/estructurar logs |
| 🟢 Baja | Randomness | `Math.random()` en contexto de seguridad (seeds) | `src/seed/admin.seed.ts:777,798` | Usar `crypto.randomBytes` |
| 🟢 Baja | Protocol injection | Inyección de propiedad remota en sanitizador | `src/shared/sanitize.ts:56-60` | Whitelist de claves |
| 🟢 Baja | Docker | Imágenes corren como **root**; sin `HEALTHCHECK` | `frontend/Dockerfile`, `frontend/Dockerfile.dev`, `Dockerfile.dev` | `USER` no-root + HEALTHCHECK |
| 🟢 Baja | Dockerfile | `COPY` con >2 args sin `/` final (posible FP) | `Dockerfile` (DS-0011) | Revisar instrucción `COPY` |
| 🟢 Baja | Calidad | Sin ESLint; 12 `SELECT *`; `SELECT *` en `super-admin.service.ts:476,490` | `rg "SELECT \*" src` | Lint + selects explícitos |

---

## 3. Evidencia dinámica de fuga RLS (Fase D)

Prueba con rol **sin BYPASSRLS** (`audit_ro`), `app.tenant_id = 'ci-alpha'`, contando filas cuyo `tenant_id <> 'ci-alpha'`:

| Tabla | Filas de otro tenant | Estado |
|---|---:|---|
| `users` (RLS) | 0 | ✅ Aislada |
| `doctors` (RLS) | 0 | ✅ Aislada |
| `clinical_records` (RLS) | 0 | ✅ Aislada |
| `clinical_templates` | **1** | ❌ **Sin RLS** |
| `specialties` | **1** | ❌ **Sin RLS** |
| `tenant_onboarding` | **1** | ❌ **Sin RLS** |
| `onboarding_documents` | **1** | ❌ **Sin RLS** |
| `subscriptions` | **1** | ❌ `authenticated_read USING(true)` |
| `subscription_invoices` | **1** | ❌ `authenticated_read USING(true)` |
| `tenant_features` | **1** | ❌ `authenticated_read USING(true)` |
| `tenant_usage` | **1** | ❌ `authenticated_read USING(true)` |

El test `tests/integration/rls-isolation.test.js` **falla** con `clinical_templates=1` (no está en la lista `KNOWN_LEAKING`), confirmando la fuga de forma reproducible.

Cobertura de esquema: **42/49** tablas con RLS `FORCE`. Sin RLS: `clinical_templates`, `onboarding_documents`, `specialties`, `tenant_onboarding` (con `tenant_id`), más globales `_migrations`, `cie10_catalog`, `jobs`.

---

## 4. Vulnerabilidades de dependencias (SCA)

| Severidad | Paquete | Instalada → Corregida | ID |
|---|---|---|---|
| CRITICAL | proxy-addr | 2.0.7 → 2.0.8 | CVE-2026-90711 |
| HIGH | axios | 1.18.1 → 1.20.0 | CVE-2026-101898/101901/101903/101905/101906/101907/101909 |
| HIGH | nodemailer | 9.1.1 → 10.0.5 | CVE-2026-90776 |
| HIGH | nodemailer | 9.1.1 → 10.0.6 | GHSA-v53p-9fqp-m79j |
| HIGH | compression | 1.8.1 → 1.8.2 | CVE-2026-87776 |
| HIGH | source-map-js | 1.2.1 → 1.2.2 | CVE-2026-93749 |
| HIGH | toml (.opencode, tooling) | 4.1.2 → 4.2.0 | CVE-2026-77465 |
| MEDIUM | axios ×5 | 1.18.1 → 1.20.0 | CVE-2026-101899/900/902/904/908 |
| MEDIUM | nodemailer ×3 | 9.1.1 → 10.0.2/10.0.9 | GHSA-6vj9/8vvx/g57g |

Total: **1 CRITICAL + 12 HIGH + 8 MEDIUM**.

---

## 5. Falsos positivos identificados (validación manual)

- `cleanup.service.ts:73` (`clear-text-logging`): solo registra **conteos**, no datos sensibles. → **FP**.
- `auth.middleware.ts:139` (`user-controlled-bypass`): `optionalAuth` es intencional (rutas públicas). → **FP / por diseño**.
- `crypto.service.ts` GCM: revisar si el uso define la longitud del tag en otro punto.
- `attachments.service.ts` path-injection: `stored_name` es hex aleatorio + ext (`path.extname` no admite separadores) → el vector real es el `tenantId` de cabecera, no el nombre de fichero.

---

## 6. Aspectos positivos verificados

- `.env` **no** versionado; solo `.env.example`.
- `logs/` está en `.gitignore` (los tokens detectados son artefacto local, no commit).
- `docker-compose.yml` publica `127.0.0.1:5432` (no expuesto a LAN).
- Helmet activo con 6 cabeceras verificadas.
- CORS con allowlist y `credentials`.
- `users`, `doctors`, `clinical_records` correctamente aisladas por RLS.
- Rol de aplicación `clinic_app` sin `BYPASSRLS`; `clinic_superadmin` con `BYPASSRLS` separado.
- Rate limiter global (500/15min) + límite de body `100kb`.
- Cookies con `COOKIE_SECRET` independiente de `JWT_SECRET` (comentario explícito).

---

## 7. Defectos de los scripts SQL (aplicación real)

Al aplicar `db/security.sql` sobre una BD fresca se produjeron 3 errores:

1. `security.sql:71-72` — `REVOKE ... ON FUNCTION audit_security_changes()/audit_phi_changes()`: **las funciones se crean después** (líneas 260+). Orden incorrecto.
2. `security.sql:144` — la política genérica falla sobre `tenants` (`column "tenant_id" does not exist`); se compensa con la política especial (línea 179).
3. `db/ci-seed-rls.sql:27` — **rompe** contra `users_password_min_length` (hash de ejemplo < 60 chars) cuando `security.sql` ya se aplicó. Drift entre el seed de CI y el hardening real.

---

## 8. Plan de corrección sugerido (prioridad)

1. 🔴 `ENABLE/FORCE RLS` + política `tenant_isolation` en las 4 tablas sin RLS; endurecer `authenticated_read` en las 4 SaaS (filtrar por `tenant_id`).
2. 🔴 Bump SCA: `proxy-addr`, `axios`, `nodemailer`, `compression`, `source-map-js`.
3. 🔴 Decidir/implementar cifrado de PHI (`PHI_MASTER_KEY`).
4. 🔴 Sanear `tenantId` y confinar rutas de fichero (`attachments`).
5. 🟡 Validar `X-Tenant-Id` en rutas públicas; mover PHI fuera de query params; rate-limit en health/estáticos.
6. 🟡 Índices `(tenant_id, …)`; `authTagLength` en GCM; redacción de tokens en logs; ReDoS.
7. 🟢 Docker non-root + HEALTHCHECK; ESLint; selects explícitos.

---

## 9. Reproducción

```powershell
# SAST
semgrep scan --config=p/nodejsscan --config=p/typescript --config=p/secrets --config=p/owasp-top-ten src frontend/src

# SCA / IaC / secretos
trivy fs --scanners vuln .
trivy config .
trivy fs --scanners secret .

# RLS dinámico (clúster de auditoría aislado)
$env:RLS_TEST_DATABASE_URL='postgresql://audit_ro:***@127.0.0.1:55432/clinic'
$env:RLS_TEST_TENANTS='ci-alpha,ci-beta'
npx vitest run tests/integration/rls-isolation.test.js --coverage.enabled=false

# CodeQL
codeql database create .codeql-db --language=javascript-typescript
codeql database analyze .codeql-db codeql/javascript-queries:codeql-suites/javascript-security-extended.qls --format=sarif-latest --output=codeql.sarif --download
```

## 10. Relacionado

- [[system-summary]]
- [[audit-2026-10-09]]
- [[plan-mejora-2026-10-09]]
- [[testing-report]]

#auditoria #seguridad #sast #sca #rls #multi-tenant #codeql #semgrep #trivy
