# Estado Actual del Proyecto

> Versión: 1.0.0 — Producción | Última auditoría: 2026-07-29 | Última sincronización del wiki con el código real: 2026-09-01

## Métricas del Proyecto

| Métrica | Valor |
|---------|-------|
| Módulos backend | 23 activos (`src/modules/`) |
| Páginas frontend | 53 (+ 18 componentes compartidos) |
| Tests backend | ~1.5k casos — 111 archivos (102 unit + 9 integración) |
| Tests frontend | ~1.2k casos — 178 archivos |
| Cobertura | Backend ~89% líneas (threshold 85%) · Frontend ~84% líneas (threshold 80%) |
| Idiomas | 4 activos (es, en, pt, fr) — 66 namespaces — ~3.500 claves c/u — paridad total verificada |
| Tablas DB | 47 (init.sql consolidado) |
| Migraciones | 23 (001–023) |
| Endpoints API | ~204 (202 routers + 2 health) |
| Middlewares | 11 |
| Shared services | 20 |
| Archivos frontend `src/` | 431 (303 `.tsx`) |
| Despliegue | Render + Docker |
| Roles | 7 (superadmin, admin, doctor, lab_technician, patient, guest, user) |
| Frontend | Único (frontend/) — sidebar dinámica por rol |

## Estado por Área

| Área | Estado | Notas |
|------|--------|-------|
| Backend tests | ✅ ~1.5k tests, ~89% cobertura | Vitest + pool forks, Supertest integración |
| Frontend | ✅ 53 páginas, 178 archivos de test, lazy loading total | React 19 + Vite 6 + MUI 6 + TS strict |
| API | ✅ ~204 endpoints | Prefijo `/api`, paginación estándar |
| CI/CD | ✅ GitHub Actions (audit + typecheck + test + build) | Deploy a Render fuera del pipeline |
| Seguridad | ✅ Helmet, CORS, rate limiting (6 niveles), Zod, 2FA, auditoría HMAC, RLS FORCE | IDOR/BOLA hardening + captcha fail-closed |
| Multi-tenancy | ✅ RLS por sesión + planes SaaS auto-gestionables | Shared DB con `tenant_id` + GUC `app.tenant_id` |
| i18n | ✅ 4 idiomas completos con paridad total | es/en/pt/fr — 66 namespaces — test `i18n-keys.test.ts` |
| ML | ⬜ Stub/simulación | `smaForecast()` (media móvil 7 días) sobre `ml_demand_forecast`; sin TF.js |
| Patient module | ✅ Portal paciente funcional | `PatientLayout` con bottom-nav propia |
| Clinical templates | ✅ Módulo agregado (2026-08-27) | Backend `/api/clinical-templates` + frontend `modules/clinical-templates` |
| Sesiones de usuario | ✅ Implementadas | Tabla `user_sessions`, endpoints `/api/auth/sessions` |
| BOLA/Ownership | ✅ Hardening aplicado (2026-08-31) | `src/shared/ownership.ts`, fail-closed |
| Sidebar por rol | ✅ Implementada | `navigation.tsx` — ver [[03-FRONTEND/Navegacion-por-Rol\|Navegación por Rol]] |

## Frontend Consolidado

El proyecto tiene un **único frontend** en `frontend/`. Las versiones anteriores (v1, v2 y `login-options`) fueron eliminadas. `frontend-v3/` permanece en el repo solo como un `node_modules` residual vacío (no se usa, no compila) — candidato a eliminar.

> ⚠️ Nota 2026-09-01: el wiki fue sincronizado con el código real. Antes citaba `frontend/src/api/` con archivos `axios.js`; hoy todo el consumo de API centraliza en `frontend/src/shared/services/api-client.ts` + 24 services por módulo.

## Convenciones Actuales

- **Commit**: Sin convención estricta (mejora posible)
- **Versionado API**: Prefijo `/api` (sin versión explícita)
- **Errores**: Formato `{ error, details, stack }` (stack solo en dev)
- **Paginación**: `{ data, pagination: { page, limit, total, totalPages } }`
- **Base de datos**: SQL raw con pg (sin ORM), RLS por sesión
- **Migraciones**: Archivos SQL en `db/migrations/` (23), runner automático en startup con tracking `_migrations`
- **TypeScript**: `strict: true` en backend y frontend (frontend además `noUncheckedIndexedAccess`)
- **i18n**: Patrón `t('ns:clave')`, `fallbackLng: 'es'`

## Deuda Técnica Identificada

| Item | Prioridad | Estado |
|------|-----------|--------|
| Seed/backfills en cada startup | 🟡 Media | Pendiente |
| Tests backend en JS (no TS) | 🟡 Media | Pendiente |
| `@types/*` en `dependencies` (no devDeps) | 🟡 Media | Pendiente |
| `docs/` no excluido en `.gitignore` | 🟡 Media | Pendiente |
| CI sin lint (ESLint) | 🟡 Media | Pendiente (`npm audit` ya implementado) |
| CI sin subida de coverage | 🟡 Media | Pendiente |
| Render plan free insuficiente | 🟡 Media | Pendiente |
| `frontend-v3/` residual (node_modules vacío) | 🟢 Baja | Pendiente (candidato a eliminar) |

### Items resueltos desde la auditoría anterior
| Item | Prioridad | Resolución |
|------|-----------|-----------|
| Secret HMAC hardcodeado como fallback | 🔴 → ✅ | `validateEnvSecurity()` ahora exige `AUDIT_HMAC_SECRET` (sin fallback); seed usa env y aborta en producción (2026-08-31) |
| Session activity Map sin eviction (memory leak) | 🔴 → ✅ | Limpieza del mapa cada 10 min en `sessionActivity.middleware.ts` |
| Queue in-memory sin persistencia | 🔴 → ✅ | Cola sobre tabla `jobs` con retry/backoff en `queue.service.ts` |
| TypeScript strict (gradual) | 🟡 → ✅ | Backend y frontend en `strict: true` |

---

Tags: #estado #metricas #deuda-tecnica #auditoria