import jwt, { JwtPayload, SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
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

  private get keysDir(): string {
    return process.env.JWT_KEYS_DIR || path.resolve(process.cwd(), 'keys');
  }

  constructor() {
    this.initialize();
  }

  private ensureKeysDir(): void {
    const dir = this.keysDir;
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
      logger.info(`Directorio de claves JWT creado: ${dir}`);
    }
  }

  private loadKeyFromFile(kid: string): KeyPair | null {
    const dir = this.keysDir;
    const privPath = path.join(dir, `jwt-${kid}.pem`);
    const pubPath = path.join(dir, `jwt-${kid}.pub`);
    if (fs.existsSync(privPath) && fs.existsSync(pubPath)) {
      try {
        const privateKey = fs.readFileSync(privPath, 'utf-8');
        const publicKey = fs.readFileSync(pubPath, 'utf-8');
        return { privateKey, publicKey, kid, createdAt: new Date() };
      } catch {
        return null;
      }
    }
    return null;
  }

  private persistKeyPair(pair: KeyPair): void {
    const dir = this.keysDir;
    this.ensureKeysDir();
    const privPath = path.join(dir, `jwt-${pair.kid}.pem`);
    const pubPath = path.join(dir, `jwt-${pair.kid}.pub`);
    fs.writeFileSync(privPath, pair.privateKey, { mode: 0o600 });
    fs.writeFileSync(pubPath, pair.publicKey, { mode: 0o644 });
  }

  private deleteKeyFile(kid: string): void {
    const dir = this.keysDir;
    try {
      fs.unlinkSync(path.join(dir, `jwt-${kid}.pem`));
      fs.unlinkSync(path.join(dir, `jwt-${kid}.pub`));
    } catch {
    }
  }

  private initialize(): void {
    this.ensureKeysDir();
    const dir = this.keysDir;
    let loadedCount = 0;

    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir).filter(f => f.startsWith('jwt-') && f.endsWith('.pem'));
      const kids = new Set(files.map(f => f.replace('jwt-', '').replace('.pem', '')));

      for (const kid of kids) {
        const pair = this.loadKeyFromFile(kid);
        if (pair) {
          this.keyHistory.set(pair.kid, pair);
          loadedCount++;
        }
      }
    }

    if (loadedCount > 0) {
      const kids = [...this.keyHistory.keys()];
      const lastKid = kids[kids.length - 1];
      this.currentKeyPair = this.keyHistory.get(lastKid) || null;
      logger.info(`JWT RS256: Cargados ${this.keyHistory.size} pares de llaves desde ${dir}/`);
    } else {
      logger.info('JWT RS256: No se encontraron llaves existentes. Generando par nuevo...');
      this.generateKeyPair();
    }

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
    this.persistKeyPair(pair);

    // Keep only last 2 key pairs for transition period
    if (this.keyHistory.size > 2) {
      const oldest = [...this.keyHistory.keys()][0];
      const removed = this.keyHistory.get(oldest);
      this.keyHistory.delete(oldest);
      if (removed) this.deleteKeyFile(removed.kid);
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
        logger.warn(`JWT RS256: Key ID ${kid} no encontrada en keys/`);
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
