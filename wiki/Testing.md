# Testing

## Stats
- **1122 tests** · 93 archivos · 0 fallos
- **Coverage:** Statements 88.9%, Branches 88.56%, Functions 92.04%, Lines 89.1%
- **Threshold:** 50% (Vitest + v8)

## Tipos de Tests

| Tipo | Archivos | Qué cubre |
|------|----------|-----------|
| Unit | 13 | auth, booking, doctor, guest, confirmation, exception, RUT, laboratory, billing, i18n, routes, ml, shared |
| Integration | 7 | auth, booking, doctor, guest-confirmation, analytics, audit, clinical-record |
| ML | 1 | Modelos ML |

## Setup
- `tests/setup.js` — mock de env vars
- DB mockeada via `vi.hoisted()` sobre `pool.query`

## Comandos
```bash
npm test              # Tests + coverage
npm run test:watch    # Watch mode
```

## Gotchas
- `vi.mock()` paths son relativos al **archivo de test**, no al source
- Ej: `vi.mock('../../src/modules/ml/ml.cache.js', ...)`
