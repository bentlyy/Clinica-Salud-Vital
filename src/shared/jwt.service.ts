import jwt, { JwtPayload, SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';
import { logger } from '../utils/logger.js';

interface KeyPair {
  privateKey: string;
  publicKey: string;
  kid: string;
  createdAt: Date;
}

class JWTManager {
  private currentKeyPair: KeyPair | null = null;
  private keyHistory: Map<string, KeyPair> = new Map();
  private refreshTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.initialize();
  }

  private initializeFromEnv(): boolean {
    const privateKey = process.env.JWT_PRIVATE_KEY;
    const publicKey = process.env.JWT_PUBLIC_KEY;
    if (privateKey && publicKey) {
      const kid = crypto.randomBytes(8).toString('hex');
      const pair: KeyPair = {
        privateKey,
        publicKey,
        kid,
        createdAt: new Date(),
      };
      this.keyHistory.set(kid, pair);
      this.currentKeyPair = pair;
      logger.info('JWT RS256: Cargado par de llaves desde variables de entorno');
      return true;
    }
    return false;
  }

  private initialize(): void {
    if (this.initializeFromEnv()) {
      this.startKeyRotation();
      return;
    }

    logger.info('JWT RS256: Variables de entorno no configuradas. Generando par en memoria...');
    this.generateKeyPair();
    this.startKeyRotation();
  }

  private generateKeyPair(): KeyPair {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 4096,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });

    const pair: KeyPair = {
      privateKey,
      publicKey,
      kid: crypto.randomBytes(8).toString('hex'),
      createdAt: new Date(),
    };

    this.keyHistory.set(pair.kid, pair);
    this.currentKeyPair = pair;

    // Keep only last 2 key pairs for transition period
    if (this.keyHistory.size > 2) {
      const oldest = [...this.keyHistory.keys()][0];
      this.keyHistory.delete(oldest);
    }

    logger.info(`JWT RS256: Nuevo par generado (kid: ${pair.kid})`);
    return pair;
  }

  private startKeyRotation(): void {
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
    this.refreshTimer = setInterval(() => {
      this.generateKeyPair();
    }, SEVEN_DAYS_MS);
    if (this.refreshTimer && typeof this.refreshTimer === 'object' && 'unref' in this.refreshTimer) {
      (this.refreshTimer as NodeJS.Timeout).unref();
    }
  }

  sign(payload: Record<string, unknown>, options?: SignOptions): string {
    if (!this.currentKeyPair) {
      throw new Error('JWT RS256: No hay par de llaves disponible');
    }
    return jwt.sign(payload, this.currentKeyPair.privateKey, {
      algorithm: 'RS256',
      keyid: this.currentKeyPair.kid,
      expiresIn: options?.expiresIn || '15m',
      ...options,
    });
  }

  verify<T = Record<string, unknown>>(token: string): (JwtPayload & T) | null {
    try {
      const decoded = jwt.decode(token, { complete: true });
      if (!decoded || typeof decoded === 'string' || !decoded.header) return null;

      const kid = decoded.header.kid as string;
      if (!kid) {
        if (!this.currentKeyPair) return null;
        return jwt.verify(token, this.currentKeyPair.publicKey, { algorithms: ['RS256'] }) as JwtPayload & T;
      }

      const pair = this.keyHistory.get(kid);
      if (!pair) {
        logger.warn(`JWT RS256: Key ID ${kid} no encontrada en memoria — probando con currentKeyPair`);
        if (this.currentKeyPair) {
          try {
            return jwt.verify(token, this.currentKeyPair.publicKey, { algorithms: ['RS256'] }) as JwtPayload & T;
          } catch {
            logger.warn('JWT RS256: Fallback verify con currentKeyPair también falló');
            return null;
          }
        }
        return null;
      }

      return jwt.verify(token, pair.publicKey, { algorithms: ['RS256'] }) as JwtPayload & T;
    } catch {
      return null;
    }
  }

  getPublicJWKS(): { keys: Record<string, unknown>[] } {
    const keys: Record<string, unknown>[] = [];
    for (const pair of this.keyHistory.values()) {
      const pubKeyObj = crypto.createPublicKey(pair.publicKey);
      const jwk = pubKeyObj.export({ format: 'jwk' });
      keys.push({
        kty: 'RSA',
        kid: pair.kid,
        n: (jwk as Record<string, unknown>).n,
        e: (jwk as Record<string, unknown>).e,
        alg: 'RS256',
        use: 'sig',
      });
    }
    return { keys };
  }

  signInvite(payload: Record<string, unknown>, expiresIn?: string): string {
    return this.sign(payload, { expiresIn: expiresIn || '24h' } as SignOptions);
  }

  getKeyCount(): number {
    return this.keyHistory.size;
  }

  destroy(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }
}

export const jwtManager = new JWTManager();

export function getJWKS() {
  return jwtManager.getPublicJWKS();
}
