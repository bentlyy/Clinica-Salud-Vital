import jwt, { SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';

const getSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required');
  }
  return secret;
};

class JWTManager {
  sign(payload: Record<string, unknown>, options?: SignOptions): string {
    return jwt.sign(payload, getSecret(), {
      expiresIn: options?.expiresIn || '15m',
      ...options,
      algorithm: 'HS256',
    });
  }

  verify<T = Record<string, unknown>>(token: string): (jwt.JwtPayload & T) | null {
    try {
      return jwt.verify(token, getSecret(), { algorithms: ['HS256'] }) as jwt.JwtPayload & T;
    } catch {
      return null;
    }
  }

  signInvite(payload: Record<string, unknown>, expiresIn?: string): string {
    return this.sign(payload, { expiresIn: expiresIn || '24h' } as SignOptions);
  }

  destroy(): void {
    // No-op: nothing to clean up
  }
}

export const jwtManager = new JWTManager();

export function getJWKS() {
  return { keys: [] };
}
