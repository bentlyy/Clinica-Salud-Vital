import { randomUUID } from 'crypto';
import { pool, tenantContext } from '../shared/db.js';
import { logger } from '../utils/logger.js';
import type { AmgIdentity, AmgRole } from './amgTypes.js';

/**
 * Cuenta local de Vitaria: qué fila de `users` (y `tenants`) corresponde a la
 * identidad que vino del Core.
 *
 * Vitaria ya no autentica: el Core decide quién puede entrar (y solo emite SSO
 * si la organización tiene la suscripción activa). Acá solo se traduce la
 * identidad del Core a las filas que el negocio sigue usando:
 *
 *   organización del Core  ->  tenants (por sso_org_id)
 *   usuario del Core       ->  users (por sso_sub)
 *
 * El tenant NO se crea al vuelo: la política RLS de `tenants` es
 * `WITH CHECK (false)` (lectura por la app, escritura solo por admin/ops). Si la
 * organización todavía no tiene un tenant vinculado, el login se rechaza con
 * `TenantNoVinculadoError` y se resuelve fuera de banda (vincular `sso_org_id`).
 */
export interface LocalAccount {
  id: number;
  email: string;
  name: string;
  role: string;
  tenantId: string;
}

/** La organización del Core todavía no tiene un tenant de Vitaria vinculado. */
export class TenantNoVinculadoError extends Error {
  constructor(readonly organizationId: string) {
    super(`No hay un tenant de Vitaria vinculado a la organización ${organizationId}`);
    this.name = 'TenantNoVinculadoError';
  }
}

/**
 * Rol local por defecto según el rol de plataforma del Core. Los permisos finos
 * siguen siendo de Vitaria; al crear/enlazar se usa admin para quien administra
 * (owner/admin) y user para el resto.
 */
const rolLocalPara = (rolCore: AmgRole): string => (rolCore === 'member' ? 'user' : 'admin');

interface TenantRow {
  id: string;
}

interface UserRow {
  id: number;
  email: string;
  name: string | null;
  role: string;
  tenant_id: string;
}

const toAccount = (row: UserRow): LocalAccount => ({
  id: row.id,
  email: row.email,
  name: row.name ?? row.email,
  role: row.role,
  tenantId: row.tenant_id,
});

async function resolverTenant(identity: AmgIdentity): Promise<string> {
  const res = await pool.query<TenantRow>(
    'SELECT id FROM tenants WHERE sso_org_id = $1 AND active = true LIMIT 1',
    [identity.organizationId],
  );
  if (res.rows.length === 0) {
    logger.warn('SSO: organización sin tenant vinculado', {
      organizationId: identity.organizationId,
      organizationSlug: identity.organizationSlug,
    });
    throw new TenantNoVinculadoError(identity.organizationId);
  }
  return res.rows[0].id;
}

async function resolverUsuario(identity: AmgIdentity, tenantId: string): Promise<LocalAccount> {
  const existente = await pool.query<UserRow>(
    'SELECT id, email, name, role, tenant_id FROM users WHERE sso_sub = $1 LIMIT 1',
    [identity.userId],
  );
  if (existente.rows.length > 0) return toAccount(existente.rows[0]);

  // Cuenta sembrada a mano con el mismo email dentro del tenant: se enlaza.
  if (identity.email) {
    const porEmail = await pool.query<UserRow>(
      'SELECT id, email, name, role, tenant_id FROM users WHERE tenant_id = $1 AND lower(email) = lower($2) LIMIT 1',
      [tenantId, identity.email],
    );
    if (porEmail.rows.length > 0) {
      await pool.query('UPDATE users SET sso_sub = $1, updated_at = NOW() WHERE id = $2', [
        identity.userId,
        porEmail.rows[0].id,
      ]);
      return toAccount(porEmail.rows[0]);
    }
  }

  const creado = await pool.query<UserRow>(
    `INSERT INTO users (email, password, name, role, active, tenant_id, sso_sub)
     VALUES ($1, $2, $3, $4, true, $5, $6)
     RETURNING id, email, name, role, tenant_id`,
    [
      identity.email || `sso-${identity.userId}@vitaria.local`,
      randomUUID(),
      identity.name || identity.email || 'Usuario',
      rolLocalPara(identity.role),
      tenantId,
      identity.userId,
    ],
  );
  return toAccount(creado.rows[0]);
}

/** Resuelve (o crea/enlaza) la cuenta local a partir de la identidad del Core. */
export async function resolveLocalAccount(identity: AmgIdentity): Promise<LocalAccount> {
  const tenantId = await resolverTenant(identity);
  // RLS: las filas de `users` solo son visibles/escribibles con
  // app.tenant_id = tenant_id, así que resolvemos el usuario dentro del contexto
  // del tenant que corresponde a la organización del Core.
  return tenantContext.run(tenantId, () => resolverUsuario(identity, tenantId));
}
