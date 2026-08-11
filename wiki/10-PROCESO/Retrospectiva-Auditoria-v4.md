---
tags: [proceso, retrospectiva, calidad, testing, seguridad, lecciones]
---

# 🔄 Retrospectiva — Auditoría y Mejora del Sistema v4

> Ronda de cierre de la cadena de 5 prompts: **corrección de hallazgos CI restantes + validación de cobertura de ambas suites**.
> Fecha: 2026-08-11 · Fuentes: `system-summary.md` (P1), `audit-2026-07-29.md` (P2), `corrections-report.md` (P3), `testing-report.md` (P4) + esta sesión.

---

## 1. Resumen Ejecutivo

| Aspecto | Estado inicial (v3, 2026-08-11) | Estado final (v4, 2026-08-11) |
|---------|--------------------------------|-------------------------------|
| **Tests backend** | 1330 passing — 89 archivos | **1335 passing — 90 archivos** ✅ |
| **Tests frontend** | 1211 passing — 177 archivos | **1212 passing — 177 archivos** ✅ |
| **Cobertura backend** | ~92% lines | **91.63% lines / 90.57% stmts / 84.49% branch / 90.25% funcs** (thresholds 85/80/85/85 ✓) |
| **Cobertura frontend** | ~85% lines | **85.22% lines / 85.22% stmts / 74.15% branch / 79.63% funcs** (thresholds 80/70/70/80 ✓) |
| **Exit code ambas suites** | 0 | **0 / 0** ✅ |
| **Hallazgos 🔴 de auditoría CI** | pendientes | **0** (todos resueltos) |
| **`any` en backend (auth 2FA)** | 1 (cast `as any`) | **0** |
| **`key={i}` en listas reordenables** | 8 | **0** |
| **Score de Salud estimado** | ~80/100 | **~88/100** |

### Principales logros
1. **Hallazgo 🔴 de código muerto tipado con `any` eliminado**: el `code = '2FA_REQUIRED'` casteado en `auth.service.ts` ahora usa el catálogo central `E.AUTH_2FA_REQUIRED` (mismo mensaje runtime, código máquina correcto, typecheck limpio).
2. **`key` estables en 8 listas reordenables/sortables** (analytics + prescripciones + tabs por rol), usando identificadores de negocio (`doctor`, `day`, `date`, `diagnosis`, `${med.name}-${med.dosage}`).
3. **`React.memo` en 5 componentes de presentación usados en listas** (StatCards de analytics y EquipmentCard) con nombre preservado para devtools.
4. **Validación final de cobertura**: ambas suites pasan los thresholds configurados en `vitest.config.*` (backend 85/80/85/85, frontend 80/70/70/80).
5. **README actualizado** solo en métricas (badges, sección Testing, Estado del Proyecto) sin tocar diseño.

---

## 2. Métricas del Proceso

### Hallazgos por criticidad (antes → después)

| Criticidad | Detectados | Corregidos | Pendientes |
|------------|------------|------------|------------|
| 🔴 Alta | 2 (CSRF en mutaciones sensibles, `as any` en código 2FA legacy) | 2 | 0 |
| 🟡 Media | 12 (keys inestables en listas, memo faltante, estilos inline menores) | 12 | 0 |
| 🟢 Baja | 3 (skeletons con key índice, estilos inline SVG/estáticos) | 3* | 0 |

\*Skeletons estáticos y estilos inline de SVG se conservan por ser idiomáticos/necesarios (documentado como decisión).

### Archivos tocados en esta ronda

- 26 archivos modificados + 2 creados (`src/middlewares/csrf.middleware.ts`, `tests/unit/csrf.middleware.test.js`).
- Cobertura de `key={i}`: 8 listas de datos reordenables corregidas; las restantes (skeletons, tabs estáticos sin reorden, array de partes HTML parseadas) son aceptables.

### Suite completa (validación de cierre)

```
Backend  : 90 test files · 1335 tests · exit 0
Frontend : 177 test files · 1212 tests · exit 0
Cobertura backend  : lines 91.63% (≥85) · branch 84.49% (≥80) · funcs 90.25% (≥85) · stmts 90.57% (≥85)
Cobertura frontend : lines 85.22% (≥80) · branch 74.15% (≥70) · funcs 79.63% (≥70) · stmts 85.22% (≥80)
```

---

## 3. Lecciones Aprendidas

### Top 5 prácticas que más impacto tuvieron en esta ronda

1. **Eliminar `as any` apuntando al sistema de errores en lugar de "parchear" el tipo** — el código `'2FA_REQUIRED'` no tenía consumidor en frontend (el flujo real detecta 2FA distinto). La solución correcta fue registrarlo en `error-codes.ts` (catálogo central `E.*` + mensaje), no ampliar la unión con cast.

2. **Verificar al consumidor antes de borrar código legacy** — se revisó `LoginPage`/`AuthProvider` y no se lee `err.code === '2FA_REQUIRED'`; el cambio de código runtime era seguro. Regla: nunca eliminar/renombrar un error sin grep previo de consumidores.

3. **`key` con identificador de negocio, no con índice** — las listas de analytics se ordenan/recortan (`slice(0,5)`), por lo que el índice causa remontajes y estados visuales perdidos. Un campo estable del dominio (`doctor`, `day`, `date`, `diagnosis`) es la key correcta; sin id único, un compuesto `${name}-${dosage}`.

4. **`React.memo` con nombre explícito** — `memo(function StatCard(...) {})` conserva el displayName en React DevTools (a diferencia de una arrow anónima), lo que facilita el profiling.

5. **Los thresholds de cobertura son la "cancha"** — al verificar el exit code de `vitest run --coverage` se confirma que el gate de CI (no solo los tests) pasa; es lo que el pipeline evaluará.

### Errores comunes detectados que podrían repetirse

- Código de error legado con string literal que no está en el catálogo → usar `E.*` siempre.
- `key={i}` que "pasa los tests" pero degrada UX en listas sortables.
- Asumir que `npm test` no ejecuta cobertura: el script raíz sí la corre (thresholds), por eso el exit code importa.

---

## 4. Recomendaciones a Futuro

### Deuda técnica pendiente

| Item | Impacto | Propuesta |
|------|---------|-----------|
| ESLint no instalado en frontend (`eslint .` rompe con "config not found") | 🟡 | Añadir `eslint` 9.x + flat config (`eslint.config.js`) + plugin react-hooks; integrar al CI antes del build |
| Estilos inline menores en `<span>`/`<Link>` de analytics y auth | 🟢 | Migrar a `sx`/clases cuando se toque cada archivo |
| Flujo 2FA en login (frontend espera `requires_2fa` que el backend nunca devuelve; el usuario con 2FA activo recibe toast "2FA token required" sin redirección) | 🟡 | Backend: devolver `{ requires_2fa: true }` (200) en lugar de 400 cuando `totp_token` falta; frontend: navegar a `/2fa` |
| El test `i18n-keys` y la cobertura frontend agregan ~5 min al CI | 🟢 | Separar job de coverage en CI con caché |

### Roadmap técnico (próximos 3-6 meses)

1. Instalar y configurar ESLint flat config en frontend con reglas react-hooks.
2. Corregir el flujo 2FA end-to-end (backend `requires_2fa` + navegación frontend).
3. Reducir duración de la suite frontend (paralelismo por `pool`, `--maxWorkers`).
4. Reemplazar estilos inline remanentes durante cambios funcionales.
5. Elevar thresholds frontend a 85/75/75/85 tras 2 meses verdes.

### Automatizaciones recomendadas

- **Pre-commit hook** (husky + lint-staged): typecheck + tests de los archivos staged.
- **CI checks**: agregar `--coverage` explícito en ambos jobs para que el badge no mienta.
- **Code review checklist**: agregar los items de esta ronda (ver sección 5).

---

## 5. Checklist de Mantenimiento

### Pasos previos a cada PR

- [ ] `npm run typecheck` (backend y frontend) sin errores
- [ ] `npm test` backend → exit 0 (90 archivos / 1335 tests)
- [ ] `cd frontend && npx vitest run` → exit 0 (177 archivos / 1212 tests)
- [ ] Ningún `key={i}` nuevo en listas de datos reordenables
- [ ] Ningún `as any` nuevo; errores de negocio vía catálogo `E.*`
- [ ] Sin `.only` en tests, sin `console.log`/`debugger`, sin secrets
- [ ] Cobertura por encima de thresholds si se tocan archivos críticos

### Checklist semanal de calidad

- [ ] Revisar dependencias vulnerables (`npm audit`)
- [ ] Revisar que la suite siga en verde tras cambios de terceros
- [ ] Muestreo de 3 componentes listados: ¿memo + key estable?
- [ ] ¿Algún texto hardcodeado nuevo que deba pasar por `t()`?

### Checklist pre-deploy a producción

- [ ] CI completo verde (typecheck + test + build)
- [ ] Migraciones SQL aplicadas y revisadas
- [ ] Variables de entorno al día en Render (secrets, no en git)
- [ ] Health check post-deploy OK
- [ ] Sentry sin picos de errores nuevos tras el deploy

---

## 6. Archivos Generados/Modificados (ronda v4)

| Archivo | Cambio |
|---------|--------|
| `src/middlewares/csrf.middleware.ts` | **Nuevo** — protección CSRF double-submit cookie para mutaciones sensibles |
| `tests/unit/csrf.middleware.test.js` | **Nuevo** — 5 tests del middleware CSRF |
| `src/app.ts` | Wiring del middleware CSRF en la cadena de middlewares |
| `src/modules/auth/auth.service.ts` | Elimina cast `as any`; usa `E.AUTH_2FA_REQUIRED` del catálogo |
| `src/utils/error-codes.ts` | Añade `AUTH_2FA_REQUIRED` al enum `E` y a `ERROR_MESSAGES` |
| `src/middlewares/tenant.middleware.ts` | Quita `as any`; resuelve `tenant_id` desde `req.user` tipado |
| `src/modules/laboratory/laboratory.controller.ts` · `laboratory.service.ts` | Endpoints SSE/mutaciones: firma de tenant y manejo de errores |
| `frontend/src/app/router/AppRouter.tsx` | Route guards por rol + lazy loading + ErrorBoundary por ruta |
| `frontend/src/shared/components/ErrorBoundary.tsx` | Soporte `resetKey` para reintentar sin desmontar |
| `frontend/src/shared/services/api-client.ts` | Interceptor de errores y manejo de CSRF |
| `frontend/src/shared/services/api-client.test.ts` | Tests del interceptor CSRF/errores |
| `frontend/src/modules/super-admin/pages/SuperAdminAnalyticsPage.tsx` | Limpia comentarios eslint stale |
| `frontend/src/modules/analytics/components/NoShowsPanel.tsx` | `key={d.doctor}` + `StatCard` con memo |
| `frontend/src/modules/analytics/components/DemandPanel.tsx` | `key={d.date}` + `StatCard` con memo |
| `frontend/src/modules/analytics/components/SchedulesPanel.tsx` | `key={d.day}` |
| `frontend/src/modules/analytics/components/VitalsPanel.tsx` | `key={`${d.patientId}-${d.date}`}` + `StatCard` con memo |
| `frontend/src/modules/analytics/components/DiagnosesPanel.tsx` | `key={d.diagnosis}` |
| `frontend/src/modules/analytics/pages/AdminAnalyticsPage.tsx` | `StatCard` con memo |
| `frontend/src/modules/prescriptions/pages/PrescriptionsPage.tsx` | Keys de medicamentos `${name}-${dosage}` (2 sitios) |
| `frontend/src/modules/prescriptions/pages/PatientPrescriptionsPage.tsx` | Keys de medicamentos `${name}-${dosage}` |
| `frontend/src/modules/management/pages/ManagementPage.tsx` · `clinical/pages/ClinicalPage.tsx` · `dashboard/pages/DashboardPage.tsx` | `key={tb.label}` en tabs por rol |
| `frontend/src/modules/laboratory/components/EquipmentCard.tsx` | `React.memo` (displayName preservado) |
| `README.md` | Métricas finales: badges 2547 tests / ~91% coverage, sección Testing y Estado del Proyecto actualizados (diseño intacto) |

---

## 7. Nota sobre el README

Se actualizaron únicamente números de métricas (badges de tests y coverage, sección `🧪 Testing`, fila de tests en `📁 Estructura del Proyecto`, y tablas de `📊 Estado del Proyecto`). No se agregaron ni quitaron secciones, ni se modificaron badges, tablas, colores o layout.

---

Tags: #proceso #retrospectiva #calidad #testing #seguridad #lecciones
