# Estado Actual del Proyecto

> Versión: 1.0.0 — Producción | Última auditoría: 2026-07-29

## Métricas del Proyecto

| Métrica | Valor |
|---------|-------|
| Módulos backend | 15 activos |
| Páginas frontend | ~50 |
| Tests backend | ~1146 passing — 77 archivos (21 fallos pre-existentes) |
| Tests frontend | 104 passing — 16 archivos |
| Cobertura | ~86% líneas (threshold 70%) |
| Idiomas | 4 activos (es, en, pt, fr) — 65 namespaces — 3.079 claves c/u — paridad total verificada |
| Tablas DB | 20+ |
| Endpoints API | ~163 |
| Middlewares | 9 |
| Shared services | 17 |
| Despliegue | Render + Docker |
| Roles | 7 (superadmin, admin, doctor, lab_technician, patient, guest, user) |
| Frontend | Único (frontend/) — sidebar dinámica por rol |

## Estado por Área

| Área | Estado | Notas |
|------|--------|-------|
| Backend tests | ✅ ~1146 tests, ~86% cobertura | Vitest + pool forks |
| Frontend | ✅ ~50 páginas, 104 tests, lazy loading, tema claro/oscuro, sidebar por rol | React 19 + Vite + MUI |
| API | ✅ ~163 endpoints documentados | Prefijo `/api`, paginación estándar |
| CI/CD | ✅ GitHub Actions (typecheck + test + build) + deploy a Render | Webhook post-deploy |
| Seguridad | ✅ Helmet, CORS, rate limiting, Zod, 2FA, auditoría HMAC | IDOR fixes + captcha fail-closed |
| Multi-tenancy | ✅ Implementado con planes SaaS auto-gestionables | Shared DB con tenant_id |
| i18n | ✅ 4 idiomas completos con paridad total | es/en/pt/fr — test `i18n-keys.test.ts` |
| ML | ⬜ Stub/simulación | Sin modelos reales implementados |
| Patient module | ✅ Módulo de pacientes funcional | Portal paciente con bottom-nav propia |
| Sidebar por rol | ✅ Implementada | `navigation.tsx` — ver [[03-FRONTEND/Navegacion-por-Rol\|Navegación por Rol]] |

## Frontend Consolidado

El proyecto tiene un **único frontend** en `frontend/`. Las versiones anteriores (v1, v2 y `login-options`) fueron eliminadas. `frontend-v3/` permanece en el repo solo como un `node_modules` residual (no se usa, no compila).

## Convenciones Actuales

- **Commit**: Sin convención estricta (mejora posible)
- **Versionado API**: Prefijo `/api` (sin versión explícita)
- **Errores**: Formato `{ error, details, stack }`
- **Paginación**: `{ data, pagination: { page, limit, total, totalPages } }`
- **Base de datos**: SQL raw con pg (sin ORM)
- **Migraciones**: Archivos SQL en `db/migrations/`, runner automático en startup
- **i18n**: Patrón `t('ns:clave')`, `fallbackLng: 'es'`

## Deuda Técnica Identificada

| Item | Prioridad | Estado |
|------|-----------|--------|
| Secret HMAC hardcodeado como fallback | 🔴 Alta | Pendiente |
| Session activity Map sin eviction (memory leak) | 🔴 Alta | Pendiente |
| Queue in-memory sin persistencia | 🔴 Alta | Pendiente |
| Seed en cada startup (lento en prod) | 🟡 Media | Pendiente |
| TypeScript strict gradual | 🟡 Media | Pendiente |
| Tests en JS (no TS) | 🟡 Media | Pendiente |
| @types/* en dependencies (no devDeps) | 🟡 Media | Pendiente |
| docs/ excluido de .gitignore | 🟡 Media | Pendiente |
| CI sin lint, security audit | 🟡 Media | Pendiente |
| Render plan free insuficiente | 🟡 Media | Pendiente |
| frontend-v3/ residual (node_modules) | 🟢 Baja | Pendiente (candidato a eliminar) |

---

Tags: #estado #metricas #deuda-tecnica #auditoria
