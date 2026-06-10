import { UnauthorizedError } from '../utils/errors.js';

export const getJWTSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new UnauthorizedError('JWT_SECRET environment variable is not set');
  }
  return secret;
};

/**
 * @deprecated Desde v3.2 — Migrado a RS256 vía jwtManager.signInvite().
 *             Los tokens de invitación ahora usan el mismo par RSA-4096 que access tokens.
 */
export const getInviteJWTSecret = (): string => {
  const secret = process.env.INVITE_JWT_SECRET;
  if (!secret || secret === process.env.JWT_SECRET) {
    return getJWTSecret();
  }
  return secret;
};

/**
 * @deprecated Desde v3.2 — Migrado a RS256 vía jwtManager.signInvite().
 *             Los tokens de confirmación ahora usan el mismo par RSA-4096 que access tokens.
 */
export const getConfirmJWTSecret = (): string => {
  const secret = process.env.CONFIRM_JWT_SECRET;
  if (!secret || secret === process.env.JWT_SECRET) {
    return getJWTSecret();
  }
  return secret;
};