import { UnauthorizedError } from '../utils/errors.js';

export const getJWTSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new UnauthorizedError('JWT_SECRET environment variable is not set');
  }
  return secret;
};