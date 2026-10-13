import 'dotenv/config';
import { Router, type Request, type Response } from 'express';
import type { AmgAuthClient, AmgResolvedConfig } from './amgTypes';
import { resolveLocalAccount } from './localAccount';

// `@amg/auth-client` es ESM; Vitaria es CommonJS/Node 20. `require` resuelve el
// build CJS (condición "require" del paquete) y evita arrastrar sus tipos de
// Express 4, tipados localmente en ./amgTypes.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { buildLoginUrl, identity: amgIdentity, loadConfig, mountAmgAuth } = require('@amg/auth-client') as AmgAuthClient;

export { buildLoginUrl };

/**
 * Integración SSO de Vitaria con el Core.
 *
 * Vitaria ya no autentica: `mountAmgAuth` valida la cookie `app_session` que el
 * Core emitió en /auth/callback, pone `req.amg` (identidad verificada) y redirige
 * al login central cuando no hay sesión. Este archivo lo monta y expone las rutas
 * que la aplicación necesita:
 *
 *   GET /api/auth/login   -> 302 al login del Core (vuelve con return_to=/)
 *   GET /api/auth/me      -> identidad del Core (depuración / API)
 *   GET /api/auth/inicio  -> el shell: cuenta local + organización + tools
 *   GET /auth/logout      -> cierra sesión (lo atiende mountAmgAuth)
 *   GET /auth/callback    -> canjea el código SSO (lo atiende mountAmgAuth)
 */

/** Config SSO de Vitaria. Fail-fast si falta el secreto. */
export const ssoConfig: AmgResolvedConfig = loadConfig(process.env, 'vitaria');

/**
 * Rutas que NO requieren sesión. El resto las exige mountAmgAuth.
 *
 * El guard corre a nivel de app y cubre también el shell SPA: por eso los assets
 * del build son públicos (si no, un request de CSS/JS se comería el redirect al
 * login del Core) y las rutas de negocio abiertas (guest, webhooks, planes) quedan
 * exentas.
 */
export const amgPublicPaths: (string | RegExp)[] = [
  '/health',
  '/api/health',
  '/health/live',
  '/api/health/live',
  '/metrics',
  '/api/metrics',
  '/favicon.ico',
  '/favicon.svg',
  '/robots.txt',
  '/manifest.webmanifest',
  /^\/assets\//,
  /^\/icons\//,
  /^\/images\//,
  /^\/fonts\//,
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/invite-info',
  '/api/saas/plans',
  '/api/saas/onboard',
  '/api/saas/webhook/mercadopago',
  '/api/currencies/rates',
  '/api/doctors/public',
  '/api/specialties',
  '/api/bookings/available-slots',
  '/api/guest/booking',
  '/api/guest/bookings',
  '/api/bookings/confirm',
  '/api/webhooks',
];

export const amgRouter = Router();

amgRouter.get('/auth/login', (req: Request, res: Response) => {
  res.redirect(302, buildLoginUrl(ssoConfig, '/'));
});

amgRouter.get('/auth/me', (req: Request, res: Response) => {
  res.json(amgIdentity(req));
});

amgRouter.get('/auth/inicio', async (req: Request, res: Response) => {
  const identity = amgIdentity(req);
  const cuenta = await resolveLocalAccount(identity);
  const herramientas =
    identity.tools && identity.tools.length > 0
      ? identity.tools
      : [{ slug: identity.product, name: 'Vitaria', url: ssoConfig.productUrl }];
  res.json({
    usuario: cuenta,
    organizacion: {
      id: identity.organizationId,
      slug: identity.organizationSlug,
      nombre: identity.organizationName,
    },
    rol: identity.role,
    herramienta: identity.product,
    herramientas,
  });
});

/** Monta la identidad del Core en la app. Debe ir antes de las rutas. */
export function mountAmgAuthMiddleware() {
  return mountAmgAuth(ssoConfig, {
    publicPaths: amgPublicPaths,
    productName: 'Vitaria',
  });
}
