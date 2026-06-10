import { pool } from './db.js';
import { logger } from '../utils/logger.js';
import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;

/**
 * Envelope encryption: wraps a Data Encryption Key (DEK) with a Master Key.
 * The master key is read from PHI_MASTER_KEY env var (64 hex chars = 256 bits).
 * Falls back to no wrapping if PHI_MASTER_KEY is not set (degraded mode for dev).
 */
export function wrapKey(plaintextKey: Buffer): Buffer {
  const masterKeyHex = process.env.PHI_MASTER_KEY;
  if (!masterKeyHex) return plaintextKey;

  const masterKey = Buffer.from(masterKeyHex, 'hex');
  if (masterKey.length !== 32) throw new Error('PHI_MASTER_KEY must be 64 hex chars (32 bytes)');

  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', masterKey, iv);
  const encrypted = Buffer.concat([cipher.update(plaintextKey), cipher.final()]);
  const tag = cipher.getAuthTag();

  return Buffer.concat([iv, tag, encrypted]);
}

export function unwrapKey(wrappedKey: Buffer): Buffer {
  const masterKeyHex = process.env.PHI_MASTER_KEY;
  if (!masterKeyHex) return wrappedKey;

  const masterKey = Buffer.from(masterKeyHex, 'hex');
  const iv = wrappedKey.subarray(0, 16);
  const tag = wrappedKey.subarray(16, 32);
  const encrypted = wrappedKey.subarray(32);

  const decipher = crypto.createDecipheriv('aes-256-gcm', masterKey, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]);
}

interface CachedKeys {
  active: crypto.KeyObject;
  history: Map<string, crypto.KeyObject>;
}

const keyCache = new Map<string, CachedKeys>();

const getTenantKeyData = async (tenantId: string): Promise<{ keyData: Buffer; keyIdentifier: string }> => {
  const result = await pool.query(
    `SELECT key_identifier, key_data_encrypted AS key_data FROM encryption_keys
     WHERE tenant_id = $1 AND status = 'active'
     ORDER BY created_at DESC LIMIT 1`,
    [tenantId]
  );
  if (result.rows.length === 0) {
    const newKey = crypto.randomBytes(KEY_LENGTH);
    const keyIdentifier = `${tenantId}-${Date.now()}`;
    await pool.query(
      `INSERT INTO encryption_keys (tenant_id, key_identifier, key_data_encrypted, algorithm)
       VALUES ($1, $2, $3, $4)`,
      [tenantId, keyIdentifier, wrapKey(newKey).toString('hex'), ALGORITHM]
    );
    return { keyData: newKey, keyIdentifier };
  }
  return { keyData: unwrapKey(Buffer.from(result.rows[0].key_data, 'hex')), keyIdentifier: result.rows[0].key_identifier };
};

const getTenantKey = async (tenantId: string): Promise<crypto.KeyObject> => {
  const cached = keyCache.get(tenantId);
  if (cached) return cached.active;
  const { keyData } = await getTenantKeyData(tenantId);
  const key = crypto.createSecretKey(keyData);
  const history = new Map<string, crypto.KeyObject>();
  history.set('active', key);
  keyCache.set(tenantId, { active: key, history });
  return key;
};

const getKeyByIdentifier = async (tenantId: string, keyIdentifier: string): Promise<crypto.KeyObject> => {
  const cached = keyCache.get(tenantId);
  if (cached?.history.has(keyIdentifier)) {
    return cached.history.get(keyIdentifier)!;
  }
  const result = await pool.query(
    `SELECT key_data_encrypted AS key_data FROM encryption_keys
     WHERE tenant_id = $1 AND key_identifier = $2`,
    [tenantId, keyIdentifier]
  );
  if (result.rows.length === 0) {
    throw new Error(`PHI key ${keyIdentifier} not found for tenant ${tenantId}`);
  }
  const key = crypto.createSecretKey(unwrapKey(Buffer.from(result.rows[0].key_data, 'hex')));
  if (cached) cached.history.set(keyIdentifier, key);
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

export const decryptPHI = async (ciphertext: string, tenantId: string, keyIdentifier?: string): Promise<string> => {
  try {
    if (!ciphertext || !ciphertext.includes(':')) return ciphertext;
    const parts = ciphertext.split(':');
    if (parts.length === 4) {
      const key = await getKeyByIdentifier(tenantId, parts[0]);
      const iv = Buffer.from(parts[1], 'hex');
      const tag = Buffer.from(parts[2], 'hex');
      const encrypted = Buffer.from(parts[3], 'hex');
      const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
      decipher.setAuthTag(tag);
      const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
      return decrypted.toString('utf8');
    }
    if (parts.length !== 3) return ciphertext;
    const iv = Buffer.from(parts[0], 'hex');
    const tag = Buffer.from(parts[1], 'hex');
    const encrypted = Buffer.from(parts[2], 'hex');
    const key = keyIdentifier
      ? await getKeyByIdentifier(tenantId, keyIdentifier)
      : await getTenantKey(tenantId);
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString('utf8');
  } catch (err) {
    logger.error('PHI decryption failed', { error: (err as Error).message, tenantId });
    throw err;
  }
};

export const clearKeyCache = (tenantId?: string, keyIdentifier?: string): void => {
  if (tenantId && keyIdentifier) {
    const cached = keyCache.get(tenantId);
    if (cached) cached.history.delete(keyIdentifier);
  } else if (tenantId) {
    keyCache.delete(tenantId);
  } else {
    keyCache.clear();
  }
};

export const getActiveKeyIdentifier = async (tenantId: string): Promise<string> => {
  const { keyIdentifier } = await getTenantKeyData(tenantId);
  return keyIdentifier;
};
