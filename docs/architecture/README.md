# Vitaria — Documentación de arquitectura (auditoría)

> Punto de entrada de la auditoría arquitectónica. **Progreso:** ver [`PROGRESS.md`](PROGRESS.md) · **Decisiones:** [`DECISIONS.md`](DECISIONS.md)

## Navegación por niveles

```
Vitaria → aplicación → subsistema → módulo → archivo → función
        → esquema Zod → endpoint → consulta SQL → tabla → pruebas → diagramas
```

## Índice

| Documento | Contenido | Estado |
|---|---|---|
| [00-inventory.md](00-inventory.md) | Estructura, stack verificado, apps, entrypoints, infra, exclusiones, dudas | ✅ Fase 0 |
| [01-system-context.md](01-system-context.md) | Contexto, sistemas externos, fronteras de confianza, arranque | ✅ tramo inicial |
| [02-subsystems.md](02-subsystems.md) | Mapa de 19 subsistemas con evidencia y estado | ✅ tramo inicial |
| [05-findings.md](05-findings.md) | Registro vivo de hallazgos (SUB-2, SUB-3, SUB-7, SUB-6, SUB-8, SUB-4, SUB-15, SUB-11, SUB-5, SUB-10, SUB-9, SUB-12, SUB-13, SUB-14, SUB-17, SUB-18, SUB-16, SUB-1, SUB-19, transversales) | ✅ 177 |
| [03-dependency-graph.md](03-dependency-graph.md) | Grafo de dependencias + catálogos | ✅ Fase 3 |
| [04-cross-cutting-concerns.md](04-cross-cutting-concerns.md) | Logging, errores, i18n, config transversal | ✅ |
| [06-test-coverage.md](06-test-coverage.md) | Matriz funcionalidad→pruebas (Fase 11) | ✅ |

### Por área

- `catalog/` — `files.csv` ✅ · `modules.csv` ✅ · `endpoints.csv` ✅ · `dependencies.csv` ✅ · `symbols.csv` ✅ · `database-access.csv` ✅
- `subsystems/<id>/` — overview · modules · files · dependencies · flows · diagrams/ (Etapa 2)
  - `subsystems/auth/` ✅ SUB-2 completado
  - `subsystems/multi-tenancy/` ✅ SUB-3 completado
  - `subsystems/clinical/` ✅ SUB-7 completado
  - `subsystems/booking/` ✅ SUB-6 completado
  - `subsystems/laboratory/` ✅ SUB-8 completado
  - `subsystems/security/` ✅ SUB-4 completado
  - `subsystems/database/` ✅ SUB-15 completado
  - `subsystems/billing/` ✅ SUB-11 completado
  - `subsystems/users/` ✅ SUB-5 completado
  - `subsystems/notifications/` ✅ SUB-10 completado
  - `subsystems/attachments/` ✅ SUB-9 completado
  - `subsystems/analytics/` ✅ SUB-12 completado
  - `subsystems/audit/` ✅ SUB-13 completado
  - `subsystems/data-portability/` ✅ SUB-14 completado (portabilidad + webhooks)
  - `subsystems/specialties/` ✅ SUB-17 completado (especialidades + monedas)
  - `subsystems/seeds/` ✅ SUB-18 completado (semillas y arranque de datos)
  - `subsystems/infrastructure/` ✅ SUB-16 completado (Docker, CI/CD, observabilidad, backup)
  - `subsystems/frontend/` ✅ SUB-1 completado (SPA React 19: router, auth, tema, i18n, UI)
  - `subsystems/onboarding/` ✅ SUB-19 completado (onboarding público, aplicaciones, legal, landing)
- `data-validation/` — zod-inventory · zod-schema-dependencies · zod-route-coverage · zod-types ⏳ (Fase 4)
- `database/` — schema · table-access-matrix · query-traceability · multi-tenancy ⏳ (Fase 7)
- `security/` ⏳ (Fase 8) · `frontend/` ⏳ (Fase 6) · `backend/` ⏳ (Fase 5) · `infrastructure/` ⏳ (Fase 10) · `testing/` ⏳ (Fase 11)
- `diagrams/` — index.md + system/ · subsystems/ · data-flows/ · detailed-flows/ ⏳

## Convenciones

- **Identificadores estables:** `APP-`, `SUB-`, `MW-`, `JOB-`, `SVC-`, `MOD-b-`, `MOD-f-`, `ROUTE-`, `ZS-`, `TBL-`, `FND-` → `00-inventory.md §10`.
- **Evidencia obligatoria:** `ruta/archivo.ts:línea` + nivel de certeza (confirmado / parcial / pendiente / NO VERIFICADO).
- **Diagramas:** Mermaid (la herramienta `diagram-design` no está disponible — D-1).
- **AS-IS vs TO-BE:** este sitio documenta AS-IS; recomendaciones solo en `05-findings.md`.
