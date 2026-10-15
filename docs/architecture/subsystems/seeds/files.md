# SUB-18 — Archivos

| Archivo | Líneas | Rol |
|---|---|---|
| `src/seed/seed.ts` | 1636 | `seed()` + 5 backfills; DDL runtime; datos clínicos demo |
| `src/seed/admin.seed.ts` | 1179 | Tenants de prueba, superadmin, admin, DEMO_* constants, `spreadSeedDates` |
| `src/seed/seed-credentials.ts` | 20 | `deriveSeedPassword` |
| `src/app.ts` | — | Orquestación post-boot (`:457-509`), crones (`:511-538`) |

## Elementos clave con línea

| Elemento | Ubicación |
|---|---|
| `seed()` | `seed.ts:109` |
| gate `seedOnStartup` (`SEED_ON_STARTUP`) | `seed.ts:118-125` |
| DDL runtime (índices/constraint) | `seed.ts:110-112,290,392` |
| `getAdminPassword` | `seed.ts:9-17` |
| `ensureDoctorsExist` | `seed.ts:62-107` |
| `backfillMedicalHistory` | `seed.ts:1065` |
| `backfillLabRequests` | `seed.ts:1115` |
| `backfillLabNotifications` | `seed.ts:1188` |
| `backfillInvoices` | `seed.ts:1281` |
| `backfillUser1Data` | `seed.ts:1439` |
| `DEMO_ADMIN_PASSWORD` | `admin.seed.ts:13` |
| `seedDefaultTenant` | `admin.seed.ts:159` |
| `seedSuperAdmin` | `admin.seed.ts:200` |
| `seedAdmin` | `admin.seed.ts:236` |
| `seedTestTenants` | `admin.seed.ts:352` |
| `spreadSeedDates` | `admin.seed.ts:1133` |
| `deriveSeedPassword` | `seed-credentials.ts:20` |
| Invocación de seeds | `app.ts:472-509` |

## Tests

- `src/seed/*` **excluido de cobertura** (config de vitest). Sin tests dedicados.
