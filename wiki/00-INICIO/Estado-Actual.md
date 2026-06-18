# Estado Actual del Proyecto

> Versión: 1.0.0 — Producción

## Métricas del Proyecto

| Métrica | Valor |
|---------|-------|
| Módulos backend | 14 activos + 1 placeholder (patient) |
| Páginas frontend | 29 |
| Tests | ~1122 (threshold: 50% cobertura) |
| Cobertura | ~89% líneas |
| Idiomas | 2 activos (es, en) — pt deprecado, fr inexistente |
| Tablas DB | 20+ |
| Endpoints API | ~70+ |
| Despliegue | Render (free tier) |

## Estado por Área

| Área | Estado |
|------|--------|
| Backend tests | ✅ ~1122 tests, ~89% cobertura |
| Frontend | ✅ 29 páginas, lazy loading, tema claro/oscuro |
| API | ✅ Documentada en [[02-BACKEND/API-Reference]] |
| CI/CD | ✅ GitHub Actions + Render deploy |
| Seguridad | ✅ Helmet, CORS, rate limiting, Zod, 2FA, auditoría |
| Multi-tenancy | ✅ Implementado con planes SaaS |
| i18n | ⚠️ Solo es/en activos |
| ML | ⬜ Solo en `dist/`, fuente no presente en `src/` |
| Patient module | ⬜ Directorio vacío — sin implementar |

## Convenciones Actuales

- **Commit**: Sin convención estricta (mejora posible)
- **Versionado API**: Prefijo `/api` (sin versión explícita)
- **Errores**: Formato `{ error, details, stack }`
- **Paginación**: `{ data, pagination: { page, limit, total, totalPages } }`
- **Base de datos**: SQL raw con pg (sin ORM)

## Deuda Técnica Identificada

| Item | Prioridad |
|------|-----------|
| Módulo `patient/` vacío | Alta |
| ML solo en `dist/` sin fuente | Media |
| pt/fr i18n incompletos o falsos | Baja |
| Sin ORM (SQL raw manual) | Media (intencional) |
| Sin tests de frontend | Media |

---

Tags: #estado #metricas #deuda-tecnica
