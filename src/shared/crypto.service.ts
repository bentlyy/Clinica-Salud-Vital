import crypto from 'crypto';
import { BadRequestError } from '../utils/errors.js';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 16;
const KEY_CACHE_MAX = 256;

const keyCache = new Map<string, Buffer>();

function getEncryptionKey(salt: Buffer): Buffer {
  const secret = process.env.ENCRYPTION_KEY;
  if (!secret) throw new Error('ENCRYPTION_KEY environment variable must be set separately from JWT_SECRET');

  const cacheKey = `${secret}:${salt.toString('hex')}`;
  const cached = keyCache.get(cacheKey);
  if (cached) {
    keyCache.delete(cacheKey);
    keyCache.set(cacheKey, cached);
    return cached;
  }

  const key = crypto.pbkdf2Sync(secret, salt, 100000, 32, 'sha256');

  if (keyCache.size >= KEY_CACHE_MAX) {
    const oldest = keyCache.keys().next().value as string | undefined;
    if (oldest !== undefined) keyCache.delete(oldest);
  }
  keyCache.set(cacheKey, key);

  return key;
}

export function encrypt(text: string): string {
  const salt = crypto.randomBytes(SALT_LENGTH);
  const key = getEncryptionKey(salt);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${tag}:${salt.toString('hex')}:${encrypted}`;
}

export function decrypt(encoded: string): string {
  const parts = encoded.split(':');
  if (parts.length !== 4) throw new BadRequestError('Invalid encrypted format');
  const [ivHex, tagHex, saltHex, encrypted] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const salt = Buffer.from(saltHex, 'hex');
  const key = getEncryptionKey(salt);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

export function getAuditHmacSecret(): string {
  const secret = process.env.AUDIT_HMAC_SECRET;
  if (!secret) {
    throw new Error('AUDIT_HMAC_SECRET environment variable is required for audit log integrity');
  }
  if (secret.length < 32) {
    throw new Error('AUDIT_HMAC_SECRET must be at least 32 characters');
  }
  return secret;
}

export function computeHmac(data: string): string {
  return crypto.createHmac('sha256', getAuditHmacSecret()).update(data).digest('hex');
}

export function hashToken(token: string): string {
  return computeHmac(token);
}
