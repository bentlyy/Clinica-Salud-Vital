/**
 * Credenciales derivadas para usuarios seed.
 *
 * Cada usuario seed recibe una contraseña ÚNICA derivada a partir de su email
 * **y de un secreto** (`SEED_CREDENTIALS_SECRET`), en vez de una regla pública
 * computable conociendo sólo el email.
 *
 * - Con `SEED_CREDENTIALS_SECRET` (>= 16 chars): `Vitaria.<slug>.<hmac12>!`
 *   donde hmac12 = primeros 12 hex de HMAC-SHA256(secreto, email).
 * - En desarrollo, sin la variable, se usa un secreto de conveniencia
 *   (`DEV_FALLBACK_SECRET`) para que los seeds sigan siendo reproducibles.
 * - En producción, sin la variable, se genera una contraseña ALEATORIA (no
 *   adivinable): el usuario no podrá iniciar sesión hasta que se le asigne una
 *   nueva. Los seeds de producción deben definir `SEED_CREDENTIALS_SECRET`.
 *
 * El superadmin y el admin de la clínica default quedan EXCLUIDOS de esta
 * regla: usan `SUPERADMIN_PASSWORD` y `ADMIN_PASSWORD` del entorno.
 */

import crypto from 'node:crypto';

const DEV_FALLBACK_SECRET = 'vitaria-dev-seed-secret-do-not-use-in-prod';

const resolveSecret = (): string => {
  const configured = process.env.SEED_CREDENTIALS_SECRET;
  if (configured && configured.length >= 16) return configured;
  if (process.env.NODE_ENV === 'production') return '';
  return DEV_FALLBACK_SECRET;
};

export const deriveSeedPassword = (email: string): string => {
  const slug = (email.split('@')[0] || email).toLowerCase();
  const secret = resolveSecret();
  const token = secret
    ? crypto.createHmac('sha256', secret).update(email.toLowerCase()).digest('hex').slice(0, 12)
    : crypto.randomBytes(9).toString('hex');
  return `Vitaria.${slug}.${token}!`;
};
