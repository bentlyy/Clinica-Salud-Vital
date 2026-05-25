import { pool } from '../../shared/db.js';
import { BadRequestError } from '../../utils/errors.js';
import crypto from 'crypto';
import { base32Encode, base32Decode } from '../../shared/base32.js';

export const generateSecret = (email: string): { secret: string; qrCodeUrl: string } => {
  const buf = crypto.randomBytes(20);
  const secret = base32Encode(buf);
  const encodedEmail = encodeURIComponent(email);
  const qrCodeUrl = `otpauth://totp/Clinic:${encodedEmail}?secret=${secret}&issuer=Clinic&algorithm=SHA1&digits=6&period=30`;
  return { secret, qrCodeUrl };
};

export const verifyToken = (secret: string, token: string): boolean => {
  if (!secret || !token) return false;
  if (token.length !== 6 || !/^\d{6}$/.test(token)) return false;

  const key = base32Decode(secret);
  const timeStep = 30;
  const currentTime = Math.floor(Date.now() / 1000);
  const currentStep = Math.floor(currentTime / timeStep);

  for (let i = -1; i <= 1; i++) {
    const counter = currentStep + i;
    const counterBuffer = Buffer.alloc(8);
    counterBuffer.writeBigInt64BE(BigInt(counter));

    const hmac = crypto.createHmac('sha1', key);
    hmac.update(counterBuffer);
    const hmacResult = hmac.digest();

    const offset = hmacResult[hmacResult.length - 1] & 0xf;
    const code =
      ((hmacResult[offset] & 0x7f) << 24) |
      ((hmacResult[offset + 1] & 0xff) << 16) |
      ((hmacResult[offset + 2] & 0xff) << 8) |
      (hmacResult[offset + 3] & 0xff);

    const calculatedToken = String(code % 1000000).padStart(6, '0');

    if (crypto.timingSafeEqual(Buffer.from(calculatedToken), Buffer.from(token))) {
      return true;
    }
  }

  return false;
};

export const enable2FA = async (userId: number, email: string): Promise<{ secret: string; qrCodeUrl: string }> => {
  const { secret, qrCodeUrl } = generateSecret(email);
  await pool.query(
    'UPDATE users SET totp_secret = $1, totp_enabled = false WHERE id = $2',
    [secret, userId]
  );
  return { secret, qrCodeUrl };
};

export const verifyAndEnable2FA = async (userId: number, token: string): Promise<boolean> => {
  const result = await pool.query('SELECT totp_secret FROM users WHERE id = $1', [userId]);
  if (!result.rows[0]?.totp_secret) {
    throw new BadRequestError('2FA not initialized');
  }

  const isValid = verifyToken(result.rows[0].totp_secret, token);
  if (!isValid) {
    throw new BadRequestError('Invalid 2FA token');
  }

  await pool.query('UPDATE users SET totp_enabled = true WHERE id = $1', [userId]);
  return true;
};

export const disable2FA = async (userId: number): Promise<void> => {
  await pool.query(
    'UPDATE users SET totp_secret = NULL, totp_enabled = false WHERE id = $1',
    [userId]
  );
};

export const is2FARequired = async (userId: number): Promise<boolean> => {
  const result = await pool.query('SELECT totp_enabled FROM users WHERE id = $1', [userId]);
  return result.rows[0]?.totp_enabled === true;
};
