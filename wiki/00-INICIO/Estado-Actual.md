# Estado Actual del Proyecto

> Versión: 1.0.0 — Producción | Última auditoría: 2026-07-27

## Métricas del Proyecto

| Métrica | Valor |
|---------|-------|
| Módulos backend | 15 activos |
| Páginas frontend | 35 |
| Components frontend | 28 |
| Tests backend | ~1130 passing |
| Tests frontend | ~294 passing |
| Cobertura | ~89% líneas |
| Idiomas | 2 activos (es, en) — ~363 claves c/u |
| Tablas DB | 20+ |
| Endpoints API | ~163 |
| Middlewares | 9 |
| Shared services | 17 |
| Despliegue | Render + Docker |
| Roles | 7 (superadmin, admin, doctor, lab_technician, patient, guest, user) |

## Estado por Área

| Área | Estado | Notas |
|------|--------|-------|
| Backend tests | ✅ ~1130 tests, ~89% cobertura | Vitest + pool forks |
| Frontend | ✅ 35 páginas, lazy loading, tema claro/oscuro | React 19 + Vite + MUI |
| API | ✅ ~163 endpoints documentados | Prefijo `/api`, paginación estándar |
| CI/CD | ⚠️ GitHub Actions (solo testing) | Sin deploy auto, sin lint en CI |
| Seguridad | ✅ Helmet, CORS, rate limiting, Zod, 2FA, auditoría HMAC | Secretos hardcodeados pendientes |
| Multi-tenancy | ✅ Implementado con planes SaaS | Shared DB con tenant_id |
| i18n | ⚠️ Solo es/en activos | pt/fr son copies de es, no traducciones reales |
| ML | ⬜ Stub/simulación | Sin modelos reales implementados |
| Patient module | ✅ Módulo de pacientes funcional | CRUD + historial |

## Frontend Consolidado

El proyecto ahora tiene un **único frontend** en `frontend/` (antes `frontend-v3`). Se eliminaron:
- `frontend/` (v1 original)
- `frontend-v2/` (versión intermedia)
- `login-options/` (prototipos HTML estáticos)

## Convenciones Actuales

- **Commit**: Sin convención estricta (mejora posible)
- **Versionado API**: Prefijo `/api` (sin versión explícita)
- **Errores**: Formato `{ error, details, stack }`
- **Paginación**: `{ data, pagination: { page, limit, total, totalPages } }`
- **Base de datos**: SQL raw con pg (sin ORM)
- **Migraciones**: Archivos SQL en `db/migrations/`, runner automático en startup

## Deuda Técnica Identificada

| Item | Prioridad | Estado |
|------|-----------|--------|
| Secret HMAC hardcodeado como fallback | 🔴 Alta | Pendiente |
| Session activity Map sin eviction (memory leak) | 🔴 Alta | Pendiente |
| Queue in-memory sin persistencia | 🔴 Alta | Pendiente |
| Seed en cada startup (lento en prod) | 🟡 Media | Pendiente |
| TypeScript strict gradual | 🟡 Media | Pendiente |
| Tests en JS (no TS) | 🟡 Media | Pendiente |
| Sin lazy loading en frontend | 🟡 Media | Pendiente |
| @types/* en dependencies (no devDeps) | 🟡 Media | Pendiente |
| docs/ excluido de .gitignore | 🟡 Media | Pendiente |
| CI sin lint, security audit, deploy auto | 🟡 Media | Pendiente |
| Render plan free insuficiente | 🟡 Media | Pendiente |

---

Tags: #estado #metricas #deuda-tecnica #auditoria
