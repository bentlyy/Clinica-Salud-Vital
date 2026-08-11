---
tags: [convenciones, calidad, estandar]
---

# Convenciones del Proyecto

> Estándares de código, seguridad y proceso para el equipo. Actualizado: Julio 2026.

## Backend (Node.js + Express + TypeScript)

### Seguridad

- Usar `??` en lugar de `||` para valores por defecto (evita string vacío como falsy)
- No ejecutar queries COUNT de verificación de existencia antes de autenticación
- Siempre agregar `.catch()` a promesas fire-and-forget (emails, logs)
- No exponer stack traces en errores HTTP excepto con flag explícito
- Validar entrada con Zod en body, params y query
- **JWT**: especificar `algorithms: ['HS256']` (o RS256) en `jwt.verify()` — nunca dejar que elijar el algoritmo
- **Fail-closed**: los middlewares de autenticación/verificación deben fallar cerrado (rechazar) ante cualquier error, no dejar pasar
- **Auth middleware**: no consultar DB en cada request — confiar en el JWT verificado. La verificación de token_version debe hacerse en memoria o con caché con TTL
- **Session activity**: usar throttling en memoria (cooldown de 5 min) en lugar de actualizar DB en cada request
- **Crypto**: usar KDF con factor de trabajo (PBKDF2/bcrypt) + HMAC para integrity check + `timingSafeEqual` para comparación

### Base de Datos

- Preferir `COUNT(*) OVER()` sobre SELECT + COUNT separados para paginación
- Usar transacciones con `pg_advisory_xact_lock` para operaciones que verifican disponibilidad
- Parametrizar siempre con `$N` (nunca interpolación de strings)
- **No usar `SELECT *`** — listar columnas explícitamente
- SSL forzado en producción (`rejectUnauthorized: true`)
- Read pool separado para consultas de solo lectura
- Transacciones con pool.connect() + BEGIN/COMMIT/ROLLBACK para operaciones que modifican múltiples tablas

### API REST

- Verbos HTTP semánticos: GET (leer), POST (crear), PATCH (actualizar parcial), DELETE (eliminar)
- Acciones que no son CRUD: usar PATCH con ruta semántica (`PATCH /:id/cancel`)
- Paginación consistente: respuesta siempre con `{ data, total, page, limit, totalPages }`
- Códigos HTTP correctos: 201 (creación), 204 (eliminación sin body), 400 (validación), 401 (no auth), 403 (sin permiso), 404 (no encontrado), 409 (conflicto), 429 (rate limit)

### Tests

- Un `it()` = un render. `@testing-library/react` hace cleanup **entre** tests, no dentro: si un escenario necesita otro estado, dividir en tests separados (nunca dos `render()` en el mismo test)
- Usar `userEvent` (no `fireEvent.change`) para interacción con componentes MUI — `fireEvent.change` no dispara el `onChange` de `TextField`
- Componentes controlados: envolver en un harness con `useState` para probar el flujo "mientras escribe..." (ej: `Combobox`)
- Leer el source antes de escribir expectativas: confirmar la dirección real de sort (primer click en `TableSortLabel` ordena `asc`), ramas condicionales, etc.
- `getByRole('link', { name })` para `<Button component={Link}>` de MUI (renderiza `<a>`, no `<button>`)
- Transiciones de cierre de menús MUI mantienen hijos montados: usar `waitFor` para las aserciones post-cierre
- Descargas programáticas (`anchor.click()` síncrono): spy en `HTMLAnchorElement.prototype.click` y verificar atributos `download`/`href`
- Mock global de `react-i18next` en `setup.ts` debe incluir `initReactI18next` (si falta, falla cualquier test que importe `api-client` → `i18n`)
- Datos de prueba sin colisiones léxicas: verificar que un substring de búsqueda no esté contenido en otras opciones (`'clinica'.includes('ca') === true`)
- Queries por rol semántico y `name` accesible, nunca por tag HTML

- No usar `mockResolvedValueOnce` secuencial para múltiples queries del mismo mock
- Preferir mockear por nombre de función o usar `mockImplementation` condicional
- Los tests de integración deben mockear `pool.connect()` si el código lo usa
- Estado compartido entre tests (ej: `lastActivityMap` global) debe resetearse o usar valores únicos por test
- Después de refactorizar comportamiento (cambiar `throw` por `next(error)`, agregar transacciones, cambiar rutas), actualizar tests inmediatamente
- Verificar que la aserción refleje EXACTAMENTE la nueva estructura de datos

## Frontend (React + TypeScript)

### Tipos

- No usar `any` — preferir `unknown` + type guard, o tipos explícitos
- Todos los componentes deben tener interfaz de props exportada
- Archivos `.js`/`.jsx` → migrar a `.ts`/`.tsx`
- `useState` siempre con tipo explícito: `useState<Tipo>(initial)`
- **isAxiosError**: usar `import { isAxiosError } from 'axios'` en catch — no asumir `error.response` existe
- **Genéricos en componentes reutilizables**: `Combobox<T>` en lugar de `Combobox` con `any`

### Rendimiento

- `React.memo` en componentes que renderizan listas
- `key` única y estable en todos los `.map()` (nunca el índice)
- `useMemo`/`useCallback` en cálculos costosos
- Lazy loading con `React.lazy` + `Suspense` para rutas pesadas

### Estilos

- No usar estilos inline — extraer a clases CSS en archivos `.css`
- Usar variables CSS del tema (`var(--color-primary)`, etc.)
- Mantener archivos CSS modulares (ej: `ui.css` para componentes compartidos)
- Clases descriptivas en inglés (kebab-case)

### i18n

- Todo texto visible debe usar `t('clave')` del hook `useI18n`
- No hardcodear strings de UI en ningún componente
- Mantener claves en `translations.js` sincronizadas entre idiomas

### Manejo de Errores

- ErrorBoundary por sección de la app (por ruta, no global)
- Mostrar errores con componentes dedicados (ErrorState)
- Usar `try/catch` con `isAxiosError` en handlers de API
- Cancelar suscripciones y fetches en cleanup de useEffect

## DevOps

- No committear `.env` con credenciales reales
- Docker: no ejecutar como root — usar `USER` no-root
- Límites de recursos en docker-compose (CPU, memoria)
- Secrets de Docker para credenciales sensibles
- **CI/CD**: pipeline debe ejecutar lint → typecheck → test → build en cada PR
- **Coverage**: threshold mínimo 70% (backend), mantener configuración en vitest.config.js
- Transpilación de JS a TS antes de build en producción

## Proceso

### Pre-commit

- [ ] `npm run typecheck` pasa (backend)
- [ ] `npm test` pasa (backend)
- [ ] Sin archivos `.only` en tests
- [ ] Sin secrets en el diff
- [ ] Sin `console.log`/`debugger`
- [ ] Sin archivos `.js` donde debería haber `.ts`

### Code Review Checklist

- [ ] `||` debe ser `??` ?
- [ ] Promesas sin await tienen `.catch()` ?
- [ ] Tipos explícitos (no `any`) ?
- [ ] `key` única y estable en listas ?
- [ ] Sin estilos inline ?
- [ ] Textos de UI pasan por `t()` ?
- [ ] Middleware nuevo es fail-closed ?
- [ ] JWT tiene `algorithms` explícito ?

---

Tags: #convenciones #estandar #calidad
