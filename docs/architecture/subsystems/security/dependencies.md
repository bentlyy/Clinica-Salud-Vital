# SUB-4 — Dependencias

## Aristas internas

| Origen | → Destino | Tipo | Evidencia |
|---|---|---|---|
| `app.ts` | security.middleware | import | `app.ts:122` |
| `app.ts` | csrf.middleware | import | `app.ts:188` |
| `app.ts` | auth.middleware (`optionalAuth`) | import | `app.ts:189` |
| `app.ts` | tenant.middleware | import | `app.ts:190` |
| `app.ts` | sessionActivity (`trackActivity`) | import | `app.ts:191` |
| `app.ts` | correlationId / requestLogger / metrics | import | `app.ts:193-195` |
| `errorHandler` | alerts.service (`notifyCritical`) | call | `errorHandler.middleware.ts:4,19` |
| `requestLogger` | sanitize (`stripSensitiveFields`) | call | `requestLogger.middleware.ts:3,10` |
| `sessionActivity` | db (`pool`) | query | `sessionActivity.middleware.ts:31,36` |
| `auth.middleware` | jwt.service / db (`readPool`) | verify/query | `auth.middleware.ts:30,104` |
| `auth.middleware` | types (`UserRole`) | type | `auth.middleware.ts:3` |
| `auth.controller` | cookies (`access_token`/`refresh_token`) | set | `auth.controller.ts:12-18,73` |

## Depende de

- **SUB-2 (Auth):** `jwt.service`, `user_sessions`, `refresh_tokens`, `token_version`.
- **SUB-3 (Multi-tenant):** `tenant.middleware`, `req.tenant_id` usado como clave de limiters.
- `utils/errors`, `utils/logger`, `shared/alerts.service`, `shared/db`.

## Es dependido por

- **Todos los routers** (cadena global de `app.ts`).
- **Frontend** (cookies httpOnly + `X-CSRF-Token`; Fase 6 por verificar).
- **Observabilidad/infra** (`/metrics`, `/health`).

## Acoplamientos detectables

- `req.tenant_id` se usa como clave de rate limit **antes/junto** a `tenantMiddleware`; si el tenant no está resuelto, cae a `ip`.
- Los limiters usan **store en memoria** → no compartido entre instancias (FND-F5).
- `optionalAuth` global deja `req.user` sin validar sesión (FND-A6/FND-F7).
