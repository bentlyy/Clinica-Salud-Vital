import { pool } from './db.js';
import { logger } from '../utils/logger.js';
import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;

const keyCache = new Map<string, crypto.KeyObject>();

const getTenantKeyData = async (tenantId: string): Promise<Buffer> => {
  const result = await pool.query(
    `SELECT key_data FROM encryption_keys
     WHERE tenant_id = $1 AND status = 'active'
     ORDER BY created_at DESC LIMIT 1`,
    [tenantId]
  );
  if (result.rows.length === 0) {
    const newKey = crypto.randomBytes(KEY_LENGTH);
    await pool.query(
      `INSERT INTO encryption_keys (tenant_id, key_identifier, key_data, algorithm)
       VALUES ($1, $2, $3, $4)`,
      [tenantId, `${tenantId}-${Date.now()}`, newKey.toString('hex'), ALGORITHM]
    );
    return newKey;
  }
  return Buffer.from(result.rows[0].key_data, 'hex');
};

const getTenantKey = async (tenantId: string): Promise<crypto.KeyObject> => {
  const cached = keyCache.get(tenantId);
  if (cached) return cached;
  const keyData = await getTenantKeyData(tenantId);
  const key = crypto.createSecretKey(keyData);
  keyCache.set(tenantId, key);
  return key;
};

export const encryptPHI = async (plaintext: string, tenantId: string): Promise<string> => {
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const key = await getTenantKey(tenantId);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return iv.toString('hex') + ':' + tag.toString('hex') + ':' + encrypted.toString('hex');
  } catch (err) {
    logger.error('PHI encryption failed', { error: (err as Error).message });
    throw err;
  }
};

export const decryptPHI = async (ciphertext: string, tenantId: string): Promise<string> => {
  try {
    if (!ciphertext || !ciphertext.includes(':')) return ciphertext;
    const parts = ciphertext.split(':');
    if (parts.length !== 3) return ciphertext;
    const iv = Buffer.from(parts[0], 'hex');
    const tag = Buffer.from(parts[1], 'hex');
    const encrypted = Buffer.from(parts[2], 'hex');
    const key = await getTenantKey(tenantId);
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString('utf8');
  } catch (err) {
    logger.error('PHI decryption failed', { error: (err as Error).message });
    return '';
  }
};

export const clearKeyCache = (tenantId?: string): void => {
  if (tenantId) {
    keyCache.delete(tenantId);
  } else {
    keyCache.clear();
  }
};
