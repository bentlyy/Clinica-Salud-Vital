# CI/CD

> Pipeline de integración continua y despliegue automático.

## GitHub Actions

Archivo: `.github/workflows/ci.yml`

### Jobs Actuales

| Job | Trigger | Descripción |
|-----|---------|-------------|
| `backend` | push/PR a main, develop | Typecheck + Tests + Build backend |
| `frontend` | push/PR a main, develop | Typecheck + Tests + Build frontend |

### Backend Job
1. PostgreSQL 15 service container
2. `npm ci`
3. `npm run typecheck`
4. `npm test` (con cobertura)
5. `npm run build:backend`

### Frontend Job
1. `npm ci` en `frontend/`
2. `npm run type-check`
3. `npm test`
4. `npm run build`

### Estado Actual

| Aspecto | Estado |
|---------|--------|
| Typecheck | ✅ Backend + Frontend |
| Tests | ✅ Backend + Frontend |
| Build | ✅ Backend + Frontend |
| Lint (ESLint) | ❌ No implementado |
| Security audit | ❌ No implementado |
| Deploy automático | ❌ No implementado (solo testing) |
| Migraciones en CI | ❌ No ejecutadas |
| Coverage report | ❌ No sube a Codecov |

### Pendiente (Mejoras)

- [ ] Agregar job de lint (ESLint + Prettier)
- [ ] Agregar security audit (npm audit)
- [ ] Ejecutar migraciones en CI antes de tests
- [ ] Deploy automático a Render via webhook
- [ ] Sube coverage a Codecov/Coveralls

---

Tags: #devops #ci-cd #github-actions
