# Guía de Contribución

> Cómo contribuir al proyecto de manera efectiva.

## Pull Requests

1. **Branch**: Crea una rama desde `master` con nombre descriptivo
2. **Cambios**: Mantén PRs pequeños y enfocados
3. **Tests**: Todos los tests deben pasar (`npm test`)
4. **TypeScript**: `npm run typecheck` sin errores
5. **Cobertura**: Mantener ≥ 50% (threshold actual)
6. **Documentación**: Actualizar Wiki si aplica

## Proceso

```mermaid
graph LR
    A[Feature branch] --> B[Typecheck + Tests]
    B --> C[Push a GitHub]
    C --> D[GitHub Actions CI]
    D --> E[Code Review]
    E --> F[Merge a master]
    F --> G[Auto-deploy Render]
```

## Estándares

- Seguir las [[09-DESARROLLO/Convenciones|convenciones del proyecto]]
- No introducir dependencias sin evaluar necesidad
- Mantener compatibilidad con Node.js 20
- No exponer secretos en código
- Actualizar `.env.example` si se agregan variables

---

Tags: #desarrollo #contribucion
