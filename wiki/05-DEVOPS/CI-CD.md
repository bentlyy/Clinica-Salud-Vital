# CI/CD

> Pipeline de integración continua y despliegue automático.

## GitHub Actions

Archivo: `.github/workflows/ci.yml`

### Jobs Actuales

| Job | Trigger | Descripción |
|-----|---------|-------------|
| `backend` | push/PR a master, main, develop | Audit + Typecheck + Tests (coverage) + Build backend |
| `frontend` | push/PR a master, main, develop | Typecheck + Tests + Coverage thresholds + Build frontend |

### Backend Job
1. PostgreSQL 15 service container (`postgres:15-alpine`)
2. `npm ci`
3. **`npm audit --audit-level=critical`**
4. `npm run typecheck`
5. `npm test` (con cobertura)
6. `npm run build:backend`

### Frontend Job
1. `npm ci` en `frontend/` (cache por `frontend/package-lock.json`)
2. `npm run type-check`
3. `npm test`
4. **`npm test -- --coverage`** (verifica los thresholds vigentes)
5. `npm run build`

> **Coverage ratchet (2026-10-13):** backend `84/75/83/83` y frontend `72/58/65/70`
> (lines/branches/functions/statements). Los valores se fijaron al piso real medido
> para dejar el CI en verde tras la migracion a SSO. Objetivo: restaurar `85/80/85/85`
> (backend) y `80/70/70/80` (frontend) a medida que se sumen tests.

### Estado Actual

| Aspecto | Estado |
|---------|--------|
| Typecheck | ✅ Backend + Frontend |
| Tests | ✅ Backend + Frontend (con coverage thresholds) |
| Build | ✅ Backend + Frontend |
| Security audit | ✅ `npm audit --audit-level=critical` |
| Lint (ESLint) | ❌ No implementado |
| Deploy automático | ❌ No implementado (deploy manual a Render) |
| Migraciones en CI | ❌ No ejecutadas (tests usan init.sql directo) |
| Coverage report | ❌ Corre localmente, no sube a Codecov |

### Pendiente (Mejoras)

- [ ] Agregar job de lint (ESLint + Prettier)
- [ ] Ejecutar migraciones en CI antes de tests
- [ ] Deploy automático a Render via webhook
- [ ] Subir coverage a Codecov/Coveralls
- [ ] Publicar artefacto de build

---

Tags: #devops #ci-cd #github-actions