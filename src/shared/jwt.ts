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
  if (!secret) {
    throw new UnauthorizedError('INVITE_JWT_SECRET environment variable must be set separately from JWT_SECRET');
  }
  if (secret === process.env.JWT_SECRET) {
    throw new UnauthorizedError('INVITE_JWT_SECRET must be different from JWT_SECRET');
  }
  return secret;
};