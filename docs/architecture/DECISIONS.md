# DECISIONS — Decisiones metodológicas de la auditoría

| # | Decisión | Motivo | Fecha |
|---|---|---|---|
| D-1 | **`diagram-design` no está disponible**: se usa **Mermaid** en Markdown como alternativa. | Verificado: `list_mcp_resources` vacío, sin skill `diagram-design` en `~/.config/opencode/skills`, no declarada en `opencode.json`. No se simula su uso (regla 17 del encargo). | 2026-10-14 |
| D-2 | **Identificadores estables** con prefijos: `APP-`, `SUB-`, `MW-`, `JOB-`, `SVC-`, `MOD-b-`, `MOD-f-`, `ROUTE-`, `ZS-`, `TBL-`, `FND-` (definidos en `00-inventory.md §10`). | Trazabilidad entre diagramas y documentos. | 2026-10-14 |
| D-3 | **Límites de subsistema por cohesión de código, no por carpetas.** Una carpeta puede aportar a varios subsistemas (ej. `src/shared` alimenta a casi todos). | Regla "no confundir directorio con sistema" del encargo. | 2026-10-14 |
| D-4 | **Exclusiones:** `node_modules/`, `frontend-v3/` (solo contiene `node_modules`), `dist/`, `coverage/`, `logs/`, `.git/`. **No excluidos como fuente:** `wiki/`, `diagramas/` (documentación previa a contrastar, no evidencia de código). | `00-inventory.md §8`. | 2026-10-14 |
| D-5 | **Niveles de certeza:** confirmado / parcialmente confirmado / pendiente / NO VERIFICADO. Las cifras del README (2730 tests, ~89%) se marcan NO VERIFICADAS hasta ejecutar la suite. | Regla 3.1 del encargo. | 2026-10-14 |
| D-6 | **No se ejecutan tests ni comandos que toquen BD en Fase 0-1** (solo lectura de código). Ejecución segura de suites se evalúa en Fase 11. | Regla 3.2 (no alterar nada). | 2026-10-14 |
| D-7 | **Separación AS-IS / TO-BE / GAP / NO VERIFICADO** en todos los documentos. Recomendaciones solo en Fase 12 y después. | Regla 3.4. | 2026-10-14 |
| D-8 | Estructura documental: se adopta la propuesta del encargo bajo `docs/architecture/` sin duplicar lo que ya existe en `docs/` (adr, api, modules) ni en `wiki/`; se enlaza en lugar de regenerar. | Regla 18 (una sola fuente de verdad). | 2026-10-14 |
