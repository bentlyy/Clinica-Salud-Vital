import { pool } from '../../shared/db.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { validateRut, cleanRut, formatRut } from '../../shared/rut.js';
import { getJWTSecret } from '../../shared/jwt.js';
import { verifyInviteToken } from '../doctor/doctor.service.js';
import { UserRole } from '../../types/index.js';
import { BadRequestError, UnauthorizedError } from '../../utils/errors.js';
import { verifyToken as verify2FAToken } from './auth-2fa.service.js';
import { logger } from '../../utils/logger.js';
import crypto from 'crypto';
import { hashToken } from '../../shared/crypto.service.js';

interface RegisterParams {
  email: string;
  password: string;
  name?: string;
  rut?: string;
  phone?: string;
  tenant_id?: string;
  invite_token?: string;
}

interface LoginParams {
  email: string;
  password: string;
  totp_token?: string;
  captcha_token?: string;
}

interface RefreshParams {
  refresh_token: string;
}

interface ChangePasswordParams {
  userId: number;
  currentPassword: string;
  newPassword: string;
}

interface User {
  id: number;
  email: string;
  name: string | null;
  rut: string | null;
  phone: string | null;
  role: UserRole;
  password: string;
  password_changed: boolean;
  totp_enabled: boolean;
  totp_secret: string | null;
  tenant_id: string;
  active: boolean;
  last_activity_at?: Date;
  failed_attempts?: number;
  locked_until?: Date | null;
  token_version?: number;
}

const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY_DAYS = 30;

const generateAccessToken = (user: { id: number; email: string; role: UserRole; tenant_id: string; token_version?: number }): string => {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role || 'user', tenant_id: user.tenant_id, token_version: user.token_version || 0 },
    getJWTSecret(),
    { algorithm: 'HS256', expiresIn: ACCESS_TOKEN_EXPIRY }
  );
};

const generateRefreshToken = async (userId: number): Promise<string> => {
  const token = crypto.randomBytes(40).toString('hex');
  const tokenHash = hashToken(token);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

  await pool.query(
    'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
    [userId, tokenHash, expiresAt]
  );

  return token;
};

const revokeRefreshToken = async (token: string): Promise<void> => {
  const tokenHash = hashToken(token);
  await pool.query('UPDATE refresh_tokens SET revoked = true WHERE token = $1', [tokenHash]);
};

const revokeAllUserRefreshTokens = async (userId: number): Promise<void> => {
  await pool.query('UPDATE refresh_tokens SET revoked = true WHERE user_id = $1', [userId]);
};

const validatePassword = (password: string): void => {
  if (password.length < 8) throw new BadRequestError('Password must be at least 8 characters');
  if (!/[A-Z]/.test(password)) throw new BadRequestError('Password must contain at least one uppercase letter');
  if (!/[a-z]/.test(password)) throw new BadRequestError('Password must contain at least one lowercase letter');
  if (!/[0-9]/.test(password)) throw new BadRequestError('Password must contain at least one number');
  if (!/[^A-Za-z0-9]/.test(password)) throw new BadRequestError('Password must contain at least one special character');
};

export const register = async ({ email, password, name, rut, phone, tenant_id, invite_token }: RegisterParams): Promise<Pick<User, 'id' | 'email' | 'rut' | 'phone'>> => {
  if (!email || !password) throw new BadRequestError('Email and password required');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new BadRequestError('Invalid email format');
  validatePassword(password);

  let role: string = 'patient';
  let specialty: string | null = null;
  let tid = tenant_id || process.env.DEFAULT_TENANT_ID || 'default';

  if (invite_token) {
    const invite = verifyInviteToken(invite_token);
    email = invite.email;
    name = invite.name;
    role = invite.role;
    specialty = invite.specialty;
    tid = invite.tenant_id || tid;
  }

  let formattedRut: string | null = null;
  if (rut) {
    const cleaned = cleanRut(rut);
    if (!validateRut(cleaned)) throw new BadRequestError('RUT inválido');
    formattedRut = formatRut(cleaned);
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  if (invite_token && role === 'doctor' && specialty) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await client.query(
        `INSERT INTO users (email, password, name, rut, phone, role, password_changed, tenant_id)
         VALUES ($1, $2, $3, $4, $5, $6, true, $7)
         RETURNING id, email, name, rut, phone, role`,
        [email, hashedPassword, name || null, formattedRut, phone || null, role, tid]
      );
      const user = result.rows[0];
      await client.query(
        `INSERT INTO doctors (name, specialty, email, user_id, tenant_id)
         VALUES ($1, $2, $3, $4, $5)`,
        [name || email, specialty, email, user.id, tid]
      );
      for (let day = 1; day <= 5; day++) {
        await client.query(
          `INSERT INTO doctor_availability (doctor_id, day_of_week, start_time, end_time, tenant_id)
           VALUES ($1, $2, $3, $4, $5)`,
          [user.id, day, '09:00', '17:00', tid]
        );
      }
      await client.query('COMMIT');
      return user;
    } catch (error: unknown) {
      await client.query('ROLLBACK');
      const pgError = error as { code?: string };
      if (pgError.code === '23505') throw new BadRequestError('Email or RUT already registered');
      throw new BadRequestError('Error creating user');
    } finally {
      client.release();
    }
  }

  try {
    const result = await pool.query(
      `INSERT INTO users (email, password, name, rut, phone, role, password_changed, tenant_id)
       VALUES ($1, $2, $3, $4, $5, $6, true, $7)
       RETURNING id, email, name, rut, phone, role`,
      [email, hashedPassword, name || null, formattedRut, phone || null, role, tid]
    );
    return result.rows[0];
  } catch (error: unknown) {
    const pgError = error as { code?: string };
    if (pgError.code === '23505') throw new BadRequestError('Email or RUT already registered');
    throw new BadRequestError('Error creating user');
  }
};

const verifyCaptcha = async (token: string): Promise<boolean> => {
  const secret = process.env.RECAPTCHA_SECRET_KEY;
  if (!secret) return true;
  try {
    const params = new URLSearchParams({ secret, response: token });
    const res = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      body: params,
      signal: AbortSignal.timeout(5000),
    });
    const data = await res.json() as { success: boolean };
    return data.success === true;
  } catch (err) {
    logger.error('reCAPTCHA verification failed, blocking login', { error: (err as Error).message });
    return false;
  }
};

export const login = async ({ email, password, totp_token, captcha_token }: LoginParams, tenantId?: string): Promise<{
  access_token: string;
  refresh_token: string;
  user: { id: number; email: string; name: string | null; role: UserRole; rut: string | null; phone: string | null; password_changed: boolean; totp_enabled: boolean; tenant_id: string };
}> => {
  if (!email || !password) throw new BadRequestError('Email and password required');

  if (!(await verifyCaptcha(captcha_token || ''))) {
    throw new BadRequestError('CAPTCHA verification failed');
  }

  const result = await pool.query<User>(`SELECT * FROM users WHERE email = $1${tenantId ? ' AND tenant_id = $2' : ''}`, tenantId ? [email, tenantId] : [email]);
  const user = result.rows[0];

  if (!user) {
    const dummyHash = '$2b$12$LJ3m4ys3Lg3YOCwFfj5NOWJX0GqBiN3H0w5Cqx3z5Gq5X5z5P5Q5S';
    await bcrypt.compare(password, dummyHash);
    throw new BadRequestError('Invalid credentials');
  }

  const isValid = await bcrypt.compare(password, user.password);

  if (!isValid) {
    await pool.query(
      `UPDATE users SET
        failed_attempts = COALESCE(failed_attempts, 0) + 1,
        locked_until = CASE WHEN COALESCE(failed_attempts, 0) + 1 >= 5 THEN NOW() + INTERVAL '15 minutes' ELSE locked_until END
      WHERE id = $1`,
      [user.id]
    );
    logger.warn('Login failed');
    throw new BadRequestError('Invalid credentials');
  }

  if (!user.active) {
    logger.warn('Login blocked - user inactive', { userId: user.id });
    throw new UnauthorizedError('Account is deactivated. Contact an administrator.');
  }

  if (user.locked_until && new Date(user.locked_until) > new Date()) {
    logger.warn('Login blocked - account locked', { userId: user.id });
    throw new UnauthorizedError('Account is temporarily locked due to too many failed attempts. Try again later.');
  }

  await pool.query(
    'UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = $1',
    [user.id]
  );

  if (user.totp_enabled) {
    if (!totp_token) {
      throw new BadRequestError('2FA token required');
    }
    if (!user.totp_secret || !verify2FAToken(user.totp_secret, totp_token)) {
      throw new BadRequestError('Invalid 2FA token');
    }
  }

  await pool.query('UPDATE users SET last_activity_at = NOW() WHERE id = $1', [user.id]);

  const access_token = generateAccessToken({
    id: user.id,
    email: user.email,
    role: user.role || 'user',
    tenant_id: user.tenant_id || process.env.DEFAULT_TENANT_ID || 'default',
    token_version: user.token_version || 0,
  });
  const refresh_token = await generateRefreshToken(user.id);

  return {
    access_token,
    refresh_token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name || null,
      role: user.role || 'user',
      rut: user.rut || null,
      phone: user.phone || null,
      password_changed: user.password_changed ?? false,
      totp_enabled: user.totp_enabled ?? false,
      tenant_id: user.tenant_id || process.env.DEFAULT_TENANT_ID || 'default',
    },
  };
};

export const refreshToken = async ({ refresh_token }: RefreshParams): Promise<{
  access_token: string;
  refresh_token: string;
} | null> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const tokenHash = hashToken(refresh_token);
    const result = await client.query(
      'SELECT * FROM refresh_tokens WHERE token = $1 AND revoked = false AND expires_at > NOW() FOR UPDATE',
      [tokenHash]
    );
    const tokenRecord = result.rows[0];
    if (!tokenRecord) {
      await client.query('ROLLBACK');
      return null;
    }

    const userResult = await client.query<User>('SELECT * FROM users WHERE id = $1 AND active = true', [tokenRecord.user_id]);
    const user = userResult.rows[0];
    if (!user) {
      await client.query('ROLLBACK');
      return null;
    }

    if (user.last_activity_at) {
      const inactiveMinutes = (Date.now() - new Date(user.last_activity_at).getTime()) / 60000;
      if (inactiveMinutes > 30) {
        await client.query('UPDATE refresh_tokens SET revoked = true WHERE token = $1', [tokenHash]);
        await client.query('COMMIT');
        return null;
      }
    }

    await client.query('UPDATE refresh_tokens SET revoked = true WHERE token = $1', [tokenHash]);
    await client.query('UPDATE users SET last_activity_at = NOW() WHERE id = $1', [user.id]);

    const newAccessToken = generateAccessToken({
      id: user.id,
      email: user.email,
      role: user.role || 'user',
      tenant_id: user.tenant_id || process.env.DEFAULT_TENANT_ID || 'default',
      token_version: user.token_version || 0,
    });

    const newToken = crypto.randomBytes(40).toString('hex');
    const newTokenHash = hashToken(newToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

    await client.query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.id, newTokenHash, expiresAt]
    );

    await client.query('COMMIT');

    return {
      access_token: newAccessToken,
      refresh_token: newToken,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const logout = async (refresh_token: string, userId?: number): Promise<void> => {
  if (userId) {
    const tokenHash = hashToken(refresh_token);
    const result = await pool.query(
      'SELECT user_id FROM refresh_tokens WHERE token = $1 AND revoked = false',
      [tokenHash]
    );
    if (result.rows.length === 0 || result.rows[0].user_id !== userId) {
      return;
    }
  }
  await revokeRefreshToken(refresh_token);
};

export const logoutAll = async (userId: number): Promise<void> => {
  await revokeAllUserRefreshTokens(userId);
};

export const changePassword = async ({ userId, currentPassword, newPassword }: ChangePasswordParams, tenantId?: string): Promise<void> => {
  validatePassword(newPassword);

  const userResult = await pool.query(`SELECT password FROM users WHERE id = $1${tenantId ? ' AND tenant_id = $2' : ''}`, tenantId ? [userId, tenantId] : [userId]);
  if (!userResult.rows[0]) throw new BadRequestError('User not found');

  const isValid = await bcrypt.compare(currentPassword, userResult.rows[0].password);
  if (!isValid) throw new BadRequestError('Current password is incorrect');

  const hashedPassword = await bcrypt.hash(newPassword, 12);
  await pool.query(
    `UPDATE users SET password = $1, password_changed = true, token_version = COALESCE(token_version, 0) + 1 WHERE id = $2${tenantId ? ' AND tenant_id = $3' : ''}`,
    tenantId ? [hashedPassword, userId, tenantId] : [hashedPassword, userId]
  );

  await revokeAllUserRefreshTokens(userId);
};
