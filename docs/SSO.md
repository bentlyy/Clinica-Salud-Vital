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
APP_URL=https://<host-de-vitaria>            # debe coincidir con el app_url del Core
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

## 6. Decisión de host (pendiente)

El Core modela cada producto como `https://<slug>.amgdeveloper.cl`. Dos caminos:

- **A (recomendado):** exponer Vitaria en `vitaria.amgdeveloper.cl` (DNS + nginx +
  Cloudflare) delante del app en Render. El app no se migra; solo se le pone
  subdominio. Encaja con el contrato del catálogo sin cambios.
- **B:** mantener `clinica-salud-vital.onrender.com` y **relajar** el contrato del
  catálogo del Core para admitir hosts externos (cambia `products.ts`/tests).
