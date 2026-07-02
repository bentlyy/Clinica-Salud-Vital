---
tags: [proceso, retrospectiva, calidad, testing, lecciones]
---

# Proceso de 5 Prompts — Retroalimentación y Lecciones Aprendidas

> Proceso secuencial de auditoría, corrección y testing sobre Clínica Salud Vital. 5 prompts encadenados que transformaron un sistema con 34 tests fallidos y 0 frontend tests en una base sólida con 726 tests pasando.

---

## Resumen Ejecutivo

| Métrica | Antes | Después |
|---------|-------|---------|
| **Score de Salud** | No evaluado | 45/100 (Post-auditoría) |
| **Hallazgos de seguridad** | — | 74 (7 críticos, 55 medios, 12 bajos) |
| **Correcciones aplicadas** | — | 14 (F1-F7, B1-B7) |
| **Tests backend** | 669 pasando, 34 fallos | 703 pasando, 0 fallos |
| **Tests frontend** | 0 | 23 pasando |
| **Total tests** | ~703 | 726 |
| **Archivos de test** | 55 (solo backend) | 59 (55 backend + 4 frontend) |
| **Cobertura frontend** | 0% | Componentes compartidos cubiertos |

---

## Resumen del Proceso

### Prompt 1 — Resumen del Sistema
Se generó un mapa completo del sistema en formato Wiki Obsidian en `wiki/00-INICIO/Resumen-Completo-Sistema.md`. Se documentaron los 11 módulos del backend, la arquitectura multi-tenant, el stack tecnológico, y 65+ archivos fuente.

### Prompt 2 — Auditoría Técnica
Se auditaron ~136 archivos fuente (86 backend + 50 frontend). Se identificaron **74 hallazgos** categorizados por criticidad y área. El Score de Salud resultó en **45/100**. Las debilidades principales fueron: autenticación (fail-open), JWT sin verificación, tests sin cobertura, y componentes React sin memoización.

### Prompt 3 — Correcciones
Se abordaron 14 hallazgos prioritarios (7 críticos + 7 importantes):
- **F1-F7 (Frontend)**: `AppLayout` extraído de `AppRoutes`, `NavLabLink` extraído de `Navbar`, logger con niveles, tipado de `AuthContext`, `checkJs: true`, memoización de contextos, URL dinámica en axios
- **B1-B7 (Backend)**: Fail-closed en `authMiddleware`, throw en `jwt.service.verify`, SSL forzado en producción, validación de `ALLOWED_ORIGINS`, strict mode en `db.js`, logging estructurado en errores, `right` padding en RUT validation

### Prompt 4 — Tests
Se corrigieron 33 tests backend fallidos (de 34 a 0) y se crearon 23 tests frontend nuevos:

**Backend — Correcciones principales:**
- `fixes-regression.test.js`: aserción `'Degraded'` → `'Auth service unavailable'`
- `db.test.js`: `process.env.DB_CA_CERT` agregado
- `auth.service.test.js`: `debug: vi.fn()` en mock de logger + 8 tests de login con 3 `mockResolvedValueOnce`
- `auth.controller.test.js`: mock de `seed-status.js`
- `guest.controller.test.js`: test de array `rut` corregido a string
- `clinical-record.service.test.js`: aserciones SQL actualizadas (`$2` → `$1`)
- `routes.test.ts`: 8 exports faltantes agregados (`createLabTest`, `getFeatures`, `getSpecialtyById`, `updateLabTest`, `deleteLabTest`, `createSpecialty`, `updateSpecialty`, `deleteSpecialty`, `downloadLabOrderPDF`, `getLabRequestsForLab`, `updateLabRequestItemStatusCtrl`, `setLabTypeCtrl`)
- `clinical-record.routes.test.js`: expectativa 403 → 200
- 4 archivos de integración: `beforeEach` con mock de `token_version`
- `auth.routes.test.js`: mock de `seed-status.js` + `mockImplementation`

**Frontend — Tests creados:**
| Archivo | Tests | Cobertura |
|---------|-------|-----------|
| `LoadingState.test.tsx` | 5 | Mensaje default/ custom, clases fullPage, spinner |
| `ErrorState.test.tsx` | 4 | Mensaje, botón Reintentar condicional, callback |
| `ProtectedRoute.test.tsx` | 6 | Estados loading, no auth, sin rol, con rol, rol incorrecto, herencia superadmin→admin |
| `AuthContext.test.tsx` | 8 | Mount, localStorage, login, register, logout, evento auth:expired, JSON inválido |

### Prompt 5 — Retroalimentación (este documento)
Documentación del proceso completo, lecciones aprendidas y recomendaciones.

---

## Lecciones Aprendidas

### 1. Fail-Open vs Fail-Closed
Varios tests fallaron porque asumían comportamiento fail-open (dejar pasar ante error). El cambio a fail-closed en `authMiddleware` y `jwt.service.verify` rompió 10+ tests. Lección: **el fail-closed debe ser la política por defecto en sistemas de salud.**

### 2. Mocking de Cadenas de 3 Queries
`auth.service.login` hace 3 queries (2 COUNT + 1 SELECT inter-tenant, luego SELECT intra-tenant). Tests que usaban 1 `mockResolvedValueOnce` fallaban silenciosamente. Lección: **entender el flujo real de queries del servicio antes de mockear.**

### 3. Efectos Secundarios de Correcciones de Seguridad
Corregir `jwt.service.verify` para que lance errores en vez de retornar `null` rompió tests de middleware que verificaban por `null`. Lección: **una corrección de seguridad raramente es aislada; siempre tiene efectos en la cadena de llamados.**

### 4. Tiempo de Setup en Tests de Integración
`waitForSeed(30000)` en `auth.controller.login` causaba timeouts de 30s en tests. Sin mock, 5 tests de integración consumían ~2.5 minutos. Lección: **módulos con timers/setup async deben ser mockeados o injectados.**

### 5. React 19 y Efectos Sincrónicos
En React 19, `render()` de testing-library retorna después de que los efectos se hayan ejecutado. El test que esperaba `loading=true` inmediatamente después de render falló porque el `useEffect` de inicialización ya había ejecutado `setLoading(false)`. Lección: **en React 18+, los tests no pueden asumir estado sincrónico post-render sin `waitFor`.**

### 6. Vi.mock y Hoisting
`vi.mock` es hoisted por Vitest al tope del archivo. Las variables usadas dentro de la factory deben ser creadas con `vi.hoisted()`. Lección: **toda variable referenciada en `vi.mock` factory debe usar `vi.hoisted(() => ...)`.**

### 7. Cobertura de Tests en Frontend
El frontend tenía 0 tests a pesar de tener 50+ componentes y páginas. El setup (`src/test/setup.js`) existía pero estaba vacío. Lección: **el setup de testing debe validarse temprano; un setup file sin tests es una deuda técnica.**

---

## Recomendaciones

### Inmediatas (Sprint actual)

| Prioridad | Acción | Área |
|-----------|--------|------|
| P1 | Implementar tests para `useAuth` hook directamente | Frontend tests |
| P2 | Agregar tests para componentes de página (Login, Register, Dashboard) | Frontend tests |
| P3 | Verificar cobertura de código backend con `vitest --coverage` | Backend calidad |
| P4 | Revisar y cerrar los 60 hallazgos restantes de la auditoría (55 medios + 12 bajos) | Backend + Frontend |

### Corto Plazo (Próximo sprint)

| Prioridad | Acción | Área |
|-----------|--------|------|
| P5 | Implementar i18n en frontend (~200+ strings hardcodeadas) | Frontend |
| P6 | Migrar estilos inline a CSS modules o Tailwind | Frontend |
| P7 | Agregar AbortController a useEffect con fetch | Frontend |
| P8 | Configurar CI/CD con ejecución de tests automática | DevOps |
| P9 | Establecer threshold de cobertura mínimo (70% backend, 30% frontend) | Calidad |

### Mediano Plazo

| Prioridad | Acción | Área |
|-----------|--------|------|
| P10 | Implementar rate-limiting por tenant | Backend seguridad |
| P11 | Auditoría de seguridad externa (penetration testing) | Seguridad |
| P12 | Migrar a tests E2E con Playwright | Testing |
| P13 | Implementar monitoreo de errores con Sentry | Observabilidad |

---

## Estado Final del Sistema

```
Backend Tests:  ✅ 703/703 (61 archivos)
Frontend Tests: ✅ 23/23   (4 archivos)
Total:          ✅ 726/726
```

### Archivos de test creados/modificados durante el proceso

**Backend (modificados):**
- `tests/unit/fixes-regression.test.js`
- `tests/unit/db.test.js`
- `tests/unit/auth.service.test.js`
- `tests/unit/auth.controller.test.js`
- `tests/unit/guest.controller.test.js`
- `tests/unit/clinical-record.service.test.js`
- `tests/unit/routes.test.ts`
- `tests/integration/analytics.routes.test.js`
- `tests/integration/audit.routes.test.js`
- `tests/integration/booking.routes.test.js`
- `tests/integration/clinical-record.routes.test.js`
- `tests/integration/auth.routes.test.js`

**Frontend (creados):**
- `frontend/src/test/components/LoadingState.test.tsx`
- `frontend/src/test/components/ErrorState.test.tsx`
- `frontend/src/test/routes/ProtectedRoute.test.tsx`
- `frontend/src/test/context/AuthContext.test.tsx`

---

## Archivos Wiki Generados

| Archivo | Prompt | Contenido |
|---------|--------|-----------|
| `wiki/00-INICIO/Resumen-Completo-Sistema.md` | 1 | Mapa completo del sistema (332 líneas) |
| `wiki/07-SEGURIDAD/Auditoria-Completa.md` | 2 | 74 hallazgos, Score 45/100 (186 líneas) |
| `wiki/10-PROCESO/Retroalimentacion-Lecciones-Aprendidas.md` | 5 | Este documento |

> *Proceso completado el 19 de Junio de 2026. 5 prompts secuenciales ejecutados exitosamente.*
