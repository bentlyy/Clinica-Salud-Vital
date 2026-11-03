# Retrospectiva — Prompts Secuenciales v2 (2026-11-03)

> Ejecución de la cadena v2.2 sobre el estado post-SSO.
> Todas las métricas son **medidas** con comandos reales, no estimadas.

---

## 1. Resumen Ejecutivo

| Indicador | Valor |
|-----------|-------|
| Score inicial (Prompt 2) | **78 / 100** |
| Score final (recalculado) | **93 / 100** |
| Hallazgos corregidos | **1 de 1 crítico** |
| Hallazgos abiertos | 1 🟡 · 1 🟢 |
| Tests backend | 1.536 → **1.538 passing** (+2) |
| Tests frontend | **1.239 passing** (sin cambios) |
| Typecheck backend / frontend | ✅ / ✅ |

**Principal logro:** se cerró una violación de aislamiento multi-tenant en el
alta pública (`POST /api/auth/register`): el `tenant_id` enviado por el cliente
se persistía sin validación, permitiendo crear cuentas en cualquier tenant.

---

## 2. Métricas Reales

```text
src/modules/auth/auth.controller.ts   | 4 +-
src/modules/auth/auth.schema.ts       | 1 -
tests/integration/auth.routes.test.js | 15 ++
tests/unit/auth.schema.test.js        | 10 ++
```

| Métrica | Antes | Después |
|---------|-------|---------|
| Archivos de código/test modificados | — | 4 |
| Líneas de test agregadas | — | +25 |
| Tests backend | 1.536 | 1.538 |
| Cobertura backend (lines) | 84.37% | 84.37% |
| Cobertura frontend (lines) | 84.16% | 84.16% |
| Exit code suites | 0 | 0 |

Comando de reproducción:

```bash
npm test && cd frontend && npm test
```

---

## 3. Score de Salud Actual

```
Base = 100
🔴 abiertos (0) × -15 =   0
🟡 abiertos (1) × -5  =  -5
🟢 abiertos (1) × -2  =  -2
Score = 93 / 100
```

Hallazgos abiertos:
- 🟡 **Tipado laxo (`any`)** en `laboratory.service.ts` y `report-pdf.service.ts`.
  Refactor amplio; requiere tipos de dominio por entidad. No se abordó para no
  arriesgar la suite.
- 🟢 **Estilos inline** (~27) en `frontend/src`, en su mayoría atributos SVG
  dinámicos o `display: none`; migrarlos a `sx`/tema no aporta seguridad.

---

## 4. Lecciones Aprendidas

- **El baseline evitó falsos positivos.** Los 1.536/1.239 tests ya pasaban; el
  fallo de navegación de jsdom es ruido conocido, no una regresión.
- **La auditoría dirigida encontró lo que los tests no cubrían.** Existía test
  de `register` con datos válidos, pero ninguno verificaba que un `tenant_id`
  del cliente fuera rechazado.
- **El flujo SSO no exime de validar el alta local.** Aunque la autenticación
  vive en el Core, `resolverUsuario()` enlaza por email dentro del tenant: una
  cuenta pre-creada con email ajeno podía quedar vinculada a la identidad SSO
  legítima.
- **Los `any` del backend están concentrados**, no dispersos: dos servicios
  explican la mayor parte. Es deuda técnica acotada y priorizable.
- **Documentación desactualizada**: README/wiki declaraban ~89% de cobertura y
  2.730 tests; el valor medido es ~84% y 2.777 passing.

---

## 5. Checklist de Mantenimiento

- [ ] Verificar que ningún endpoint público acepta `tenant_id`/`role` del cliente.
- [ ] Verificar que `registerSchema` sigue sin `tenant_id` (`.strict()`).
- [ ] Verificar que NO hay `${}` interpolado en consultas SQL (solo logs/seed).
- [ ] Verificar que `algorithm` sigue fijado a `HS256` en `jwt.service`.
- [ ] Verificar que las rutas públicas de `amgPublicPaths` son mínimas y justificadas.
- [ ] Verificar que la identidad se toma de `req.amg` y no de body/header.
- [ ] Verificar que ningún middleware de request usa `throw` (solo el validador de arranque).
- [ ] Verificar `.env.example` trackeado y `.env` fuera de git.
- [ ] Verificar paridad i18n (4 idiomas, 72 namespaces).
- [ ] Ejecutar `npm test` + `cd frontend && npm test` antes de cada PR.

---

## 6. Actualización de Documentación

Actualizado sin rediseñar:
- `README.md` — badges: `tests-2777 passing`, `coverage-~84%`.
- `wiki/00-INICIO/Estado-Actual.md` — métricas de tests y cobertura.
- `wiki/00-INICIO/Resumen-Completo-Sistema.md` — tabla de métricas.
- `wiki/testing-report.md` — sección de actualización (histórico conservado).

---

## 7. Archivos Modificados

**Código**
- `src/modules/auth/auth.controller.ts` — el alta ya no acepta `tenant_id` del cliente.
- `src/modules/auth/auth.schema.ts` — se retiró `tenant_id` del schema estricto.

**Tests**
- `tests/unit/auth.schema.test.js` — rechazo de `tenant_id` del cliente.
- `tests/integration/auth.routes.test.js` — 400 y cero queries ante intento cross-tenant.

**Documentación**
- `README.md`, `wiki/00-INICIO/Estado-Actual.md`, `wiki/00-INICIO/Resumen-Completo-Sistema.md`, `wiki/testing-report.md`, este documento.

---

Tags: #auditoria #calidad #testing #retrospectiva #v2
