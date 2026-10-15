# SUB-2 — Dependencias y trazabilidad (Nivel 4-5)

## Dependencias entrantes (quién usa SUB-2)

| Origen | Relación | Tipo |
|---|---|---|
| `src/app.ts:265` | monta `authRoutes` en `/api/auth` | estática |
| `src/app.ts:189-191` | `optionalAuth` + `tenantMiddleware` + `trackActivity` corren en toda petición | ejecución |
| Todos los módulos con rutas protegidas | importan `authMiddleware`/`authorize` | estática |
| `frontend/src/shared/providers/AuthProvider.tsx` | usa `api-client` (`/auth/login`, `/auth/refresh`, `/auth/logout`) | HTTP |
| `frontend/src/shared/services/api-client.ts` | llama `/auth/refresh` ante 401 | HTTP |
| AppRouter / rutas protegidas (Fase 6) | consumen `useAuth()` | ejecución |

## Dependencias salientes (qué usa SUB-2)

| Destino | Símbolo | Tipo | Evidencia |
|---|---|---|---|
| `src/shared/jwt.service.ts` | `jwtManager.sign/verify` | ejecución | `auth.service.ts:111`; `auth.middleware.ts:30` |
| `src/shared/crypto.service.ts` | `hashToken/encrypt/decrypt` | ejecución | `auth.service.ts:12,356,756` |
| `src/shared/sessions.service.ts` | `listUserSessions/revokeUserSession/revokeAllUserSessions` | ejecución | `auth.controller.ts:79,89`; `auth.service.ts:669` |
| `src/shared/email.service.ts` | `sendEmail` | ejecución | `auth.service.ts:858` |
| `src/shared/base32.ts` | `base32Encode/Decode` | ejecución | `auth.service.ts:705,720` |
| `src/shared/rut.ts` | `validateRut/cleanRut/formatRut` | ejecución | `auth.service.ts:155-157` |
| `src/modules/doctor/doctor.service.ts` | `verifyInviteToken` | ejecución | `auth.service.ts:145`; `auth.controller.ts:51` |
| `src/shared/seed-status.ts` | `waitForSeed` | ejecución | `auth.controller.ts:61` |
| `src/shared/db.ts` | `pool/readPool/superAdminPool` | infraestructura | `auth.service.ts:1` |
| `src/seed/admin.seed.ts` | `DEMO_TENANT_ID/DEMO_ADMIN_EMAIL` | datos | `auth.service.ts:3` |
| `pg`, `bcrypt`, `crypto`, `jsonwebtoken` | libs | infraestructura | imports `auth.service.ts:1-11` |

## Dependencias de datos (tablas tocadas)

| Tabla | Operaciones | Evidencia |
|---|---|---|
| `users` | SELECT (login, me, 2fa, reset), INSERT (register team/standalone), UPDATE (password, token_version, failed_attempts*, active, totp_*, last_activity) | `auth.service.ts:167,201,277,342,691,758,788,818,919,955` |
| `refresh_tokens` | INSERT (login/refresh), UPDATE revoked (logout/change/reset/reuse), SELECT FOR UPDATE (refresh) | `auth.service.ts:381,436-448,462,587,607,645,657,923,959` |
| `user_sessions` | INSERT (login), UPDATE last_seen/revoked_at | `auth.service.ts:361,443,589,651,662`; `sessions.service.ts:32,51,67,83` |
| `password_reset_tokens` | INSERT/UPSERT, SELECT FOR UPDATE, UPDATE used | `auth.service.ts:848,894,924` |
| `tenants` | SELECT currency/country (billing) | `auth.service.ts:88-92` |
| `doctors` + `doctor_availability` | INSERT (register con invitación de doctor) | `auth.service.ts:173-187` |

<details>
<summary>* <b>Nota FND-A1:</b> el UPDATE de <code>failed_attempts</code> se revierte con ROLLBACK (ver flows.md §login).</summary>
</details>

## Dependencias contractuales (esquemas compartidos backend↔frontend)

| Contrato | Backend | Frontend | Estado |
|---|---|---|---|
| `refreshSchema = z.object({}).strict()` | `auth.schema.ts:29` | envía `{}` | alineado |
| `AuthResponse` (`access_token, refresh_token, user`) | `auth.service.ts:251-254` | `api.types.ts` | **posible desalineación** (`requires_2fa` — FND-A5) |
| Cookie CSRF `csrf_token` + header `X-CSRF-Token` | `csrf.middleware.ts` | `api-client.ts:55-103` | alineado (verificar nombre exacto en Fase 4/8) |
| Password policy | Zod + service (duplicado) | ¿validación en `RegisterPage`? | **verificar** (Fase 4 FND-A4) |

## Dependencias circulares detectadas

Ninguna. Verificado: `src/modules/doctor/` **no importa** `auth.service` (grep sin resultados), por lo que el enlace `auth.service → doctor.service` (`verifyInviteToken`) no forma ciclo. Confirmado.
