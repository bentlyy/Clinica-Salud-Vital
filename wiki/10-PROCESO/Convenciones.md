---
tags: [convenciones, calidad, estandar]
---

# Convenciones del Proyecto

> Estándares de código, seguridad y proceso para el equipo.

## Backend (Node.js + Express + TypeScript)

### Seguridad
- Usar `??` en lugar de `||` para valores por defecto (evita string vacío como falsy)
- No ejecutar queries COUNT de verificación de existencia antes de autenticación
- Siempre agregar `.catch()` a promesas fire-and-forget (emails, logs)
- No exponer stack traces en errores HTTP excepto con flag explícito
- Validar entrada con Zod en body, params y query

### Base de Datos
- Preferir `COUNT(*) OVER()` sobre SELECT + COUNT separados para paginación
- Usar transacciones con `pg_advisory_xact_lock` para operaciones que verifican disponibilidad
- Parametrizar siempre con `$N` (nunca interpolación de strings)

### Tests
- No usar `mockResolvedValueOnce` secuencial para múltiples queries del mismo mock
- Preferir mockear por nombre de función o usar `mockImplementation` condicional
- Los tests de integración deben mockear `pool.connect()` si el código lo usa

## Frontend (React + TypeScript)

### Tipos
- No usar `any` — preferir `unknown` + type guard, o tipos explícitos
- Todos los componentes deben tener interfaz de props exportada
- Archivos `.jsx` → migrar a `.tsx`
- `useState` siempre con tipo explícito: `useState<Tipo>(initial)`

### Rendimiento
- `React.memo` en componentes que renderizan listas
- `key` única y estable en todos los `.map()` (nunca el índice)
- `useMemo`/`useCallback` en cálculos costosos
- Lazy loading con `React.lazy` + `Suspense` para rutas pesadas

### Estilos
- No usar estilos inline — extraer a clases CSS en archivos `.css`
- Usar variables CSS del tema (`var(--color-primary)`, etc.)

### i18n
- Todo texto visible debe usar `t('clave')`
- No hardcodear strings de UI

## DevOps

- No committear `.env` con credenciales reales
- Docker: no ejecutar como root — usar `USER` no-root
- Límites de recursos en docker-compose (CPU, memoria)
- Secrets de Docker para credenciales sensibles

## Proceso

### Pre-commit
- TypeCheck pasa
- Tests pasan (backend + frontend)
- Sin archivos `.only` en tests
- Sin secrets en el diff

### Code Review
- Verificar que `||` no deba ser `??`
- Verificar `.catch()` en promesas sin await
- Verificar tipos explícitos (no `any`)
- Verificar keys en listas

---

Tags: #convenciones #estandar #calidad
