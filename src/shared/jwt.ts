import { UnauthorizedError } from '../utils/errors.js';

export const getJWTSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new UnauthorizedError('JWT_SECRET environment variable is not set');
  }
  return secret;
};

export const getInviteJWTSecret = (): string => {
  const secret = process.env.INVITE_JWT_SECRET;
  if (!secret || secret === process.env.JWT_SECRET) {
    return getJWTSecret();
  }
  return secret;
};