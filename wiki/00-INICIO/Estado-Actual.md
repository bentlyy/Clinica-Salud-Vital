# Estado Actual del Proyecto

> Versión: 1.0.0 — Producción | Última auditoría: 2026-10-15 | Última sincronización del wiki con el código real: **2026-11-02**

## Métricas del Proyecto

| Métrica | Valor |
|---------|-------|
| Módulos backend | 24 activos (`src/modules/`) |
| Páginas frontend | 61 (+ 21 componentes compartidos) |
| Tests backend | 1.538 passing (2 skipped) — 114 archivos (104 unit + 10 integración) |
| Tests frontend | 1.239 casos — 184 archivos |
| Cobertura | Backend 84.37% líneas (threshold 84%) · Frontend 84.16% líneas (threshold 72%) |
| Idiomas | 4 activos (es, en, pt, fr) — 72 namespaces — ~3.750 claves c/u — paridad total verificada |
| Tablas DB | 49 (init.sql consolidado) |
| Migraciones | 34 (001–032, 035, 036) |
| Endpoints API | ~200 |
| Middlewares | 12 |
| Shared services | 23 |
| Archivos backend `src/` | 152 `.ts` |
| Archivos frontend `src/` | 460 (325 `.tsx`) |
| Despliegue | Render + Docker |
| Roles | 7 (superadmin, admin, doctor, lab_technician, patient, guest, user) |
| Frontend | Único (frontend/) — sidebar dinámica por rol |
| Autenticación | SSO con el Core AMG (`@amg/auth-client`) |

## Estado por Área

| Área | Estado | Notas |
|------|--------|-------|
| Backend tests | ✅ 1.538 passing, 84.37% cobertura | Vitest + pool forks, Supertest integración |
| Frontend | ✅ 61 páginas, 184 archivos de test, lazy loading total | React 19 + Vite 6 + MUI 6 + TS strict |
| API | ✅ ~200 endpoints | Prefijo `/api`, paginación estándar |
| Autenticación | ✅ SSO Core AMG | Cookie `app_session`, guard global, login central; sin JWT propio |
| CI/CD | ✅ GitHub Actions (audit + typecheck + test + build + RLS isolation) | Deploy a Render fuera del pipeline |
| Seguridad | ✅ Helmet, CORS, rate limiting (6 niveles), Zod, CSRF double-submit, auditoría HMAC, RLS FORCE | IDOR/BOLA hardening + captcha fail-closed |
| Multi-tenancy | ✅ RLS por sesión + planes SaaS auto-gestionables | Shared DB con `tenant_id` + GUC `app.tenant_id` |
| i18n | ✅ 4 idiomas completos con paridad total | es/en/pt/fr — 72 namespaces — test `i18n-keys.test.ts` |
| ML | ⬜ Stub/simulación | `smaForecast()` (media móvil 7 días) sobre `ml_demand_forecast`; sin TF.js |
| Patient module | ✅ Portal paciente funcional | `PatientLayout` con bottom-nav propia |
| Clinical templates | ✅ Módulo agregado | Backend `/api/clinical-templates` + frontend `modules/clinical-templates` |
| Sesiones de usuario | ✅ Delegadas al Core + actividad local | `user_sessions` + `trackActivity` |
| BOLA/Ownership | ✅ Hardening aplicado | `src/shared/ownership.ts`, fail-closed |
| Sidebar por rol | ✅ Implementada | `navigation.tsx` — ver [[03-FRONTEND/Navegacion-por-Rol\|Navegación por Rol]] |

## Autenticación (cambio mayor)

Desde la migración a SSO (commits `bc9920e`, `bccefd5`):

- El login, logout, refresh y perfil los gestiona el **Core AMG**.
- `src/sso/amgSso.ts` monta `mountAmgAuth` y expone `/api/auth/login`, `/api/auth/me`, `/api/auth/inicio`.
- El backend ya **no emite JWT ni valida contraseñas**; solo conserva el alta por invitación (`/api/auth/register` + `/api/auth/invite-info`).
- El frontend carga la sesión con `GET /api/auth/inicio` y redirige al Core en 401.

## Frontend Consolidado

El proyecto tiene un **único frontend** en `frontend/`. Las versiones anteriores (v1, v2 y `login-options`) fueron eliminadas. `frontend-v3/` permanece en el repo solo como un `node_modules` residual vacío (no se usa, no compila) — candidato a eliminar.

> El consumo de API se centraliza en `frontend/src/shared/services/api-client.ts` + servicios por módulo (`analytics.ts`, `pricing.service.ts`).

## Convenciones Actuales

- **Commit**: Sin convención estricta (mejora posible)
- **Versionado API**: Prefijo `/api` (sin versión explícita)
- **Errores**: Formato `{ error, details, stack }` (stack solo en dev)
- **Paginación**: `{ data, pagination: { page, limit, total, totalPages } }`
- **Base de datos**: SQL raw con pg (sin ORM), RLS por sesión
- **Migraciones**: Archivos SQL en `db/migrations/` (34), runner automático en startup con tracking `_migrations`
- **TypeScript**: `strict: true` en backend y frontend (frontend además `noUncheckedIndexedAccess`)
- **i18n**: Patrón `t('ns:clave')`, `fallbackLng: 'es'`

## Deuda Técnica Identificada

| Item | Prioridad | Estado |
|------|-----------|--------|
| Seed/backfills en cada startup | 🟡 Media | Pendiente |
| Tests backend en JS (no TS) | 🟡 Media | Pendiente |
| `@types/*` en `dependencies` (no devDeps) | 🟡 Media | Pendiente |
| `docs/` no excluido en `.gitignore` | 🟡 Media | Pendiente |
| CI backend sin lint (ESLint) | 🟡 Media | Pendiente (`npm audit` ya implementado) |
| CI sin subida de coverage | 🟡 Media | Pendiente |
| Render plan free insuficiente | 🟡 Media | Pendiente |
| `frontend-v3/` residual (node_modules vacío) | 🟢 Baja | Pendiente (candidato a eliminar) |
| Código muerto de auth local (JWT/2FA propio) | 🟢 Baja | Revisar tras migración SSO |

### Items resueltos desde la auditoría anterior
| Item | Prioridad | Resolución |
|------|-----------|-----------|
| Secret HMAC hardcodeado como fallback | 🔴 → ✅ | `validateEnvSecurity()` exige `AUDIT_HMAC_SECRET` (sin fallback) |
| Session activity Map sin eviction (memory leak) | 🔴 → ✅ | Limpieza del mapa cada 10 min en `sessionActivity.middleware.ts` |
| Queue in-memory sin persistencia | 🔴 → ✅ | Cola sobre tabla `jobs` con retry/backoff en `queue.service.ts` |
| TypeScript strict (gradual) | 🟡 → ✅ | Backend y frontend en `strict: true` |
| Autenticación local fragmentada | 🔴 → ✅ | Migración completa a SSO con el Core AMG |

---

Tags: #estado #metricas #deuda-tecnica #auditoria
