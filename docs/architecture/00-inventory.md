# Fase 0 — Inventario del repositorio

> **Estado:** COMPLETADO (Etapa 1) · **Fecha:** 2026-10-14 · **Certeza:** confirmado salvo indicación.

## 1. Estructura real del repositorio

```
clinic-backendcopia/                 ← raíz = backend (package.json "vitaria-backend" v1.0.0)
├── src/                            ← backend TypeScript (150 archivos .ts)
│   ├── app.ts                      ← PUNTO DE ENTRADA (Express app + arranque)
│   ├── modules/                    ← 24 módulos de dominio (patrón modular)
│   ├── middlewares/                 ← 12 middlewares globales
│   ├── shared/                      ← 23 servicios compartidos (db, jwt, email, queue…)
│   ├── jobs/                        ← 2 jobs cron internos
│   ├── seed/                        ← seeds de arranque (admin.seed, seed, credentials)
│   ├── utils/                       ← logger, errors, error-codes
│   ├── types/ y @types/             ← tipos globales (express.d.ts, index.ts)
├── frontend/                        ← SPA React (package.json "vitaria-frontend" v3.0.0)
│   ├── src/main.tsx                 ← PUNTO DE ENTRADA frontend
│   ├── src/app/router/AppRouter.tsx ← Router
│   ├── src/modules/                 ← 32 módulos de UI
│   ├── src/{i18n,shared,test}/      ← i18n, componentes compartidos, tests (185 archivos)
│   └── vite.config.ts               ← proxy /api → http://localhost:3000
├── db/
│   ├── init.sql                     ← esquema inicial
│   ├── migrations/                  ← 31 migraciones numeradas (001–031)
│   ├── ci-rls-bootstrap.sql, ci-seed-rls.sql ← RLS para CI
│   ├── security.sql, optimize.sql, postgresql.conf
├── tests/                           ← 115 tests backend (unit/integration) + setup.js
├── .github/workflows/               ← ci.yml (3 jobs), backup.yml
├── docs/                            ← docs existentes (adr, api, modules, performance)
├── diagramas/                       ← 8 diagramas HTML preexistentes (Mermaid/HTML)
├── wiki/                            ← wiki Obsidian con auditorías previas
├── render.yaml                      ← Render: vitaria-api (web) + vitaria-frontend (static)
├── Dockerfile, Dockerfile.dev, docker-compose{,.override,.prod}.yml
├── vitest.config.js                 ← config tests backend (thresholds 85/80/85/85)
└── scripts/                         ← backup(.sh/.ps1), backup-verify, prospeccion/
```

## 2. Stack verificado (evidencia: `package.json`, `frontend/package.json`)

| Componente | Versión declarada | Evidencia | Estado |
|---|---|---|---|
| Node.js | 20.x (`engines`), `.node-version` | `package.json:6` | confirmado |
| Express | ^4.22.2 | `package.json:42` | confirmado |
| TypeScript | ^5.8.3 (backend), ~5.7 (frontend) | ambos package.json | confirmado |
| PostgreSQL driver | `pg` ^8.18.0 (SQL directo, **sin ORM**) | `package.json:51` | confirmado |
| Zod **backend** | ^4.4.3 | `package.json:55` | confirmado |
| Zod **frontend** | ^3.24.0 | `frontend/package.json:42` | confirmado — **dos versiones mayores distintas (4 vs 3)** |
| React | ^19.0.0 | `frontend/package.json:34` | confirmado |
| Vite | ^6.0.0 | `frontend/package.json:56` | confirmado |
| Material UI | ^6.4.0 | `frontend/package.json:26` | confirmado |
| TanStack Query | ^5.62.0 | `frontend/package.json:27` | confirmado — estado de servidor |
| JWT | `jsonwebtoken` ^9.0.3 | `package.json:47` | confirmado |
| Vitest / Supertest | ^4.1.11 / ^7.2.2 | devDependencies | confirmado |
| PDF | `pdfkit` ^0.18.0 | `package.json:50` | confirmado |
| Correo | `nodemailer` ^9.1.1 + `@sendgrid/mail` ^8.1.6 | `package.json:24,49` | confirmado (uso de SendGrid **pendiente**: solo 1 import en .env.example) |
| Sentry | `@sentry/node` ^10.56.0 | `package.json:25` | confirmado (init en `src/app.ts:73`) |
| Mercado Pago | **NO hay dependencia SDK** | grep package.json sin resultado | implementado vía HTTP crudo en `src/shared/mercadopago.service.ts` (confirmado: sin imports de SDK) |
| Rate limiting | `express-rate-limit` ^7.5.0 | `package.json:45` | confirmado (4 limiters en `src/app.ts:197-252`) |
| Métricas | `prom-client` ^15.1.3 | `package.json:52` | confirmado (`/metrics`, `src/app.ts:141`) |
| Cron | `node-cron` ^4.2.1 | `package.json:48` | confirmado (3 crons en `src/app.ts:512-538`) |
| ORM | **No existe** | sin dependencias typeorm/prisma/knex | confirmado negativo |

**Discrepancia vs contexto asumido:** el contexto indicaba "Zod" único; en realidad backend usa Zod 4 y frontend Zod 3 (contratos potencialmente divergentes — ver Fase 4).

## 3. Aplicaciones y procesos ejecutables

| ID | Aplicación | Comando | Evidencia |
|---|---|---|---|
| APP-1 | Backend API | dev: `tsx src/app.ts` · prod: `node dist/app.js` | `package.json:10-11` |
| APP-2 | Frontend SPA | dev: `vite` · build: `tsc -b && vite build` | `frontend/package.json:7-8` |
| APP-3 | PostgreSQL 15 | `postgres:15-alpine` (compose/CI/Render) | `docker-compose.yml`, `ci.yml:16` |
| APP-4 | Landing estática | `landing-vitaria.html` suelto en raíz (¿desplegada? pendiente) | raíz del repo |

## 4. Puntos de entrada

- **Backend:** `src/app.ts` — crea Express, encadena middlewares globales, registra 25 routers bajo `/api`, ejecuta `startServer()` salvo en `NODE_ENV=test` (`src/app.ts:583-588`).
- **Frontend:** `frontend/src/main.tsx` → `src/app/router/AppRouter.tsx`.
- **Salud:** `GET /health`, `/api/health`, `/health/live`, `/metrics` (`src/app.ts:136-142`).
- **Migraciones:** runner propio en `runMigration()` dentro de `src/app.ts:301-395` (aplica `db/init.sql` + `db/migrations/*.sql` con `_migrations`, reintentos y reconciliación).

## 5. Dependencias principales (declaradas, no verificadas en ejecución)

- Backend 34 runtime deps (`package.json:23-56`); tipos `@types/*` mezclados en `dependencies` (no `devDependencies`).
- Frontend 27 runtime deps (`frontend/package.json:16-43`).
- Ninguna dependencia circular entre apps (frontend no importa backend; backend no importa frontend).

## 6. Configuración e infraestructura detectadas

| Elemento | Archivo | Detalle |
|---|---|---|
| Deploy producción | `render.yaml` | vitaria-api (web, free, healthCheck `/health`) + vitaria-frontend (static_site, rewrite a index.html) |
| Docker dev | `Dockerfile.dev`, `docker-compose.yml` | servicios `db`, `backend`, `frontend` |
| Docker prod | `Dockerfile`, `docker-compose.prod.yml` | — |
| CI | `.github/workflows/ci.yml` | jobs: `backend` (typecheck+test+build), `rls-isolation` (Postgres real + RLS), `frontend` (typecheck+test+coverage+build) |
| Backup | `.github/workflows/backup.yml`, `scripts/backup.{sh,ps1}` | — |
| Env vars | `.env.example` (92 líneas, 30+ claves) | **no se muestran valores** — ver `DECISIONS.md` |
| Tests | `vitest.config.js` (raíz) + `frontend` vitest integrado en Vite | thresholds backend: lines 85, branches 80, functions 85, statements 85 |

## 7. Estrategia de pruebas

- **Backend:** 115 archivos `*.test.{js,ts}` en `tests/` (unit + integration con Supertest), `tests/setup.js`, mock de DB en `tests/helpers/db.mock.js`. Excluye `src/app.ts`, `src/seed`, `src/jobs` de cobertura (`vitest.config.js:16`).
- **Frontend:** 185 archivos de test en `frontend/src/test/` (Vitest + Testing Library + jsdom).
- **RLS:** test de integración dedicado contra Postgres real (`tests/integration/rls-isolation.test.js`, job CI separado).
- **Cifras del README (2730 tests, ~89% cobertura): NO VERIFICADAS** — no se ejecutaron tests en esta fase.

## 8. Directorios excluidos del análisis

| Directorio | Motivo |
|---|---|
| `node_modules/`, `frontend/node_modules/`, `frontend-v3/node_modules/` | dependencias instaladas |
| `frontend-v3/` | **solo contiene `node_modules`** — restos de una versión previa, sin código fuente |
| `dist/`, `coverage/`, `logs/`, `tsconfig.tsbuildinfo` | artefactos generados |
| `.git/` | control de versiones |
| `pruebas-navegador/` | artefactos manuales de QA (catalogar en Fase 11 si aporta) |
| `wiki/`, `diagramas/`, QA reports en raíz | **no se excluyen como fuente**: son documentación previa a contrastar, no evidencia de código |
| Raíz `api-test*.js`, `dbtest*.js`, `login-test.js`, `check-*.js` | scripts ad-hoc sueltos — catalogar como deuda/herramientas auxiliares (punto 9) |

## 9. Dudas para fases posteriores

1. **¿`mercadopago.service.ts` implementa la API vía fetch?** (sin SDK — verificar endpoints y stub mode `global.mercadopagoWarning`).
2. **¿`@sendgrid/mail` se usa o solo nodemailer?** (grep de import pendiente).
3. **¿RLS activo en producción?** (migraciones 020-023, 025; `DATABASE_URL_SUPERADMIN` con BYPASSRLS; verificar aplicación real).
4. **¿`frontend-v3` debe excluirse definitivamente?** (solo node_modules — pendiente confirmar con el equipo).
5. **Zod 3 vs Zod 4**: ¿los schemas comparten contratos? riesgo de divergencia.
6. **Scripts raíz sueltos** (`api-test*.js`, `dbtest*.js`): ¿se usan en el flujo o son desechables?
7. **`landing-vitaria.html`**: ¿se despliega o es material de marketing?
8. **`TWILIO_*` en .env.example**: ¿hay integración SMS real en código? (grep pendiente en Fase 10).
9. **Cobertura real**: ejecutar `npm test` en fase posterior (requiere servicios; registrar limitación).

## 10. Inventario de identificadores estables (inicial)

Catálogo ampliable en `catalog/`. Prefijos usados:

- `APP-n` aplicaciones · `SUB-n` subsistemas · `MOD-b-n` módulos backend · `MOD-f-n` módulos frontend · `MW-n` middlewares · `JOB-n` jobs · `SVC-n` servicios compartidos · `ROUTE-n` endpoints (Fase 5) · `ZS-n` esquemas Zod (Fase 4) · `TBL-n` tablas (Fase 7) · `FND-n` hallazgos (Fase 12).
