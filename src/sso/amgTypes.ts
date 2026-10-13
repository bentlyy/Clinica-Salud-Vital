import type { RequestHandler } from 'express';

/**
 * Tipos locales de la integración con el Core.
 *
 * `@amg/auth-client` es ESM y tipa contra Express 4; Vitaria es CommonJS sobre
 * Node 20. Importar sus tipos arrastraría un segundo `@types/express` que
 * redefine `Request` y choca con el del proyecto. Por eso acá se declara la
 * porción de la API que usamos y el paquete se carga por su build CJS con
 * `require` (ver amgSso.ts): sin import estático, no se cargan sus .d.ts.
 */

export type AmgRole = 'owner' | 'admin' | 'member';

export interface AmgTool {
  slug: string;
  name: string;
  url: string;
}

/** Identidad verificada del usuario en ESTE producto (la pone el Core). */
export interface AmgIdentity {
  userId: string;
  organizationId: string;
  organizationSlug: string;
  organizationName: string;
  tools: AmgTool[];
  role: AmgRole;
  email: string;
  name: string;
  product: string;
  sessionId: string;
  issuedAt?: number;
  expiresAt?: number;
}

/** Config SSO ya resuelta (subconjunto que Vitaria consulta). */
export interface AmgResolvedConfig {
  coreUrl: string;
  productUrl: string;
  clientId: string;
  clientSecret: string;
  isProd: boolean;
  callbackPath: string;
  sessionCookie: string;
  sessionDays: number;
  introspect: boolean;
}

/** La parte de la API de `@amg/auth-client` que usa Vitaria. */
export interface AmgAuthClient {
  loadConfig(env: NodeJS.ProcessEnv, productSlug?: string): AmgResolvedConfig;
  mountAmgAuth(
    config: AmgResolvedConfig,
    options?: { publicPaths?: (string | RegExp)[]; productName?: string },
  ): RequestHandler;
  identity(req: unknown): AmgIdentity;
  buildLoginUrl(config: AmgResolvedConfig, returnTo?: string, state?: string): string;
}

declare global {
  namespace Express {
    interface Request {
      /** Identidad del usuario en este producto, validada por mountAmgAuth. */
      amg?: AmgIdentity;
    }
  }
}
