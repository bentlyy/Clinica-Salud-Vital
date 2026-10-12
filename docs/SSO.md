# SSO de Vitaria con el Core (`@amg/platform`)

Vitaria dejó de autenticar con contraseñas propias: el **Core es la única
identidad**. El Core emite la cookie `app_session`; Vitaria la valida con
`mountAmgAuth` y resuelve la cuenta local correspondiente.

- Guard: `src/sso/amgSso.ts` (`mountAmgAuthMiddleware`) + rutas `/api/auth/{login,me,inicio}`.
- Traducción Core→cuenta local: `src/sso/localAccount.ts` (tenant por `tenants.sso_org_id`, usuario por `users.sso_sub`).
- Migración de vínculo: `db/migrations/032_amg_sso.sql`.

## 1. Prerrequisitos en el Core

En el repo del Core (`bentlyy/SaaSs`, paquete `@amg/platform`):

1. **Producto** con `slug = vitaria` y su `app_url` (lo siembra `seedCatalog()`).
2. **Cliente SSO** (`ensureSsoClient('vitaria')`) — se crea junto al catálogo y usa
   `redirect_uri = ${app_url}/auth/callback`.
3. **Secreto** derivado por HKDF del root:

   ```bash
   npm run sso:secret -w @amg/platform -- vitaria        # imprime el secreto
   npm run sso:secret -w @amg/platform -- vitaria --rotate  # rota
   ```

   El secreto es **determinista** (HKDF de `AMG_SSO_ROOT_SECRET` + slug): no es
   aleatorio y no vive en el repo. Cópialo al `.env` de Vitaria.

> El contrato del catálogo exige `https://<slug>.amgdeveloper.cl` para todos los
> productos (incluidos los externos, como `taller`). El `app_url` de Vitaria
> define el `redirect_uri`; ver la **decisión de host** al final.

## 2. Variables de entorno de Vitaria

```
CORE_URL=https://desarrollo.amgdeveloper.cl
APP_URL=https://vitaria.amgdeveloper.cl        # debe coincidir con el app_url del Core
AMG_SSO_CLIENT_ID=vitaria
AMG_SSO_CLIENT_SECRET=<secreto derivado en el paso 1.3>
# Opcionales: AMG_CALLBACK_PATH=/auth/callback (def), AMG_SESSION_COOKIE=app_session (def),
# AMG_SSO_INTROSPECT=0|1 (1 = re-valida contra el Core en cada request)
```

`APP_URL` **debe** ser idéntico al `app_url` guardado en el Core: el
`redirect_uri` se compara por igualdad exacta (sin prefijos ni comodines).

## 3. Vincular el tenant (obligatorio)

La RLS de `tenants` tiene `WITH CHECK(false)`: la app **no puede** crear ni
editar tenants en runtime. El vínculo se hace fuera de banda con el rol
superadmin (`DATABASE_URL_SUPERADMIN`, BYPASSRLS):

```sql
-- 1) Verificar que el tenant exista y esté sin vincular.
SELECT id, name, sso_org_id FROM tenants;

-- 2) Vincular el tenant a la organización del Core.
UPDATE tenants
   SET sso_org_id = '<organizationId del Core>'
 WHERE id = '<tenant_id local>';
```

Sin este vínculo, el login se rechaza con `TenantNoVinculadoError`.

Los usuarios se resuelven por `sso_sub`; si la fila local aún no lo tiene, se
enlaza por email en el primer ingreso (ver `localAccount.ts`).

## 4. Rollout

1. Aplicar `032_amg_sso.sql` en la BD de Vitaria.
2. Desplegar el Core con el producto/cliente `vitaria`; derivar el secreto.
3. Setear las env de Vitaria (paso 2) y redesplegar.
4. Vincular el tenant (paso 3).
5. Probar `GET /api/auth/login` → login del Core → `/auth/callback` → `GET /api/auth/inicio`.

## 5. Troubleshooting

- **`TenantNoVinculadoError`** → falta el `UPDATE tenants ... sso_org_id` (paso 3).
- **`redirect_uri` rechazado** → `APP_URL` de Vitaria ≠ `app_url` del Core.
- **`client_secret` inválido** → secreto rotado en el Core; volver a copiar.
- **Assets/CSS pidiendo login** → revisar `amgPublicPaths` en `src/sso/amgSso.ts`.

## 6. Host (decidido: `vitaria.amgdeveloper.cl`)

El Core modela cada producto como `https://<slug>.amgdeveloper.cl`. Vitaria se
expone en **`vitaria.amgdeveloper.cl`** (el app sigue en Render; no se migra).

Pasos de infra (ops):

1. **Render**: agregar `vitaria.amgdeveloper.cl` como **custom domain** del
   servicio (Render valida el host y emite el certificado).
2. **Cloudflare** (zona `amgdeveloper.cl`): registro **CNAME** `vitaria` →
   `clinica-salud-vital.onrender.com`, **proxied** (naranja). Igual que los demás
   subdominios.
3. `APP_URL=https://vitaria.amgdeveloper.cl` en Vitaria y `app_url` idéntico en el
   Core (el `redirect_uri` se compara por igualdad exacta).

Con esto no se relaja el contrato del catálogo. (La alternativa B —mantener
`onrender.com` y relajar los tests del Core— queda descartada.)

## 7. Pendientes (deuda registrada al cierre del SSO)

Cosas que quedaron **explícitamente para el final** (decisión: no bloquean el SSO):

- **Gates de cobertura del CI (preexistente, NO lo causó el SSO).** El job `CI`
  ya lleva rojo desde ~22-sep-2026. Medido en `master` (`bafe7af`):
  Lines 84.53 / Branches 75.42 / Funcs 83.21 / Stmts 83.41, contra los umbrales
  de `vitest.config.js` (85/80/85/85). El **backend** además fallaba antes en
  `npm audit --audit-level=critical` (ya corregido en esta rama con `npm audit fix`).
  El **frontend** (`frontend/vitest.config.ts` + paso `Check coverage thresholds`)
  también incumple sus umbrales en `master` y en este PR.
  Decisión (12-oct-2026): **no tocar los umbrales ni perseguir la cobertura ahora**;
  se retoma al final. Módulos con más hueco (para cuando se aborde): `shared/metrics.service.ts`
  (~5% branch), `modules/saas/*onboarding*.service.ts` (~26% branch), `shared/currencies.ts`,
  `shared/db.ts`, `shared/ownership.ts`, controllers de `attachments`/`calendar`, `modules/booking`.
  Esta rama mejora levemente el global (branches 75.74) y retira código muerto de la purga
  (`shared/base32.ts`, `encrypt/decrypt/hashToken` de `shared/crypto.service.ts`).
- **Ops al desplegar (dependen del usuario):** (1) mergear `SaaSs#1` para registrar el
  producto/cliente `vitaria` y derivar el secreto (`npm run sso:secret -w @amg/platform -- vitaria`);
  (2) custom domain `vitaria.amgdeveloper.cl` en Render + CNAME proxied en Cloudflare;
  (3) aplicar `db/migrations/032_amg_sso.sql` y **vincular `tenants.sso_org_id`** (fuera de banda,
  BYPASSRLS: la app no puede crear/escribir `tenants` por FORCE RLS con `WITH CHECK(false)`).
- **Precio placeholder:** el producto `vitaria` en el catálogo del Core usa `29900` CLP/mes como
  placeholder; confirmar tarifa real antes de producción.
- **`docs/db-architecture.html`** aún cita `packages/core/src/db/init.ts` (ruta inexistente);
  requiere reescritura.


