import { pool } from '../../shared/db.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { validateRut, cleanRut, formatRut } from '../../shared/rut.js';
import { getJWTSecret } from '../../shared/jwt.js';
import { UserRole } from '../../types/index.js';
import { BadRequestError } from '../../utils/errors.js';
import { verifyToken as verify2FAToken } from './auth-2fa.service.js';
import crypto from 'crypto';

interface RegisterParams {
  email: string;
  password: string;
  name?: string;
  rut?: string;
  phone?: string;
  tenant_id?: string;
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
}

const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY_DAYS = 30;

const generateAccessToken = (user: { id: number; email: string; role: UserRole; tenant_id: string }): string => {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role || 'user', tenant_id: user.tenant_id },
    getJWTSecret(),
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
};

const generateRefreshToken = async (userId: number): Promise<string> => {
  const token = crypto.randomBytes(40).toString('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

  await pool.query(
    'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
    [userId, token, expiresAt]
  );

  return token;
};

const revokeRefreshToken = async (token: string): Promise<void> => {
  await pool.query('UPDATE refresh_tokens SET revoked = true WHERE token = $1', [token]);
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

export const register = async ({ email, password, name, rut, phone, tenant_id }: RegisterParams): Promise<Pick<User, 'id' | 'email' | 'rut' | 'phone'>> => {
  if (!email || !password) throw new BadRequestError('Email and password required');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new BadRequestError('Invalid email format');
  validatePassword(password);

  let formattedRut: string | null = null;
  if (rut) {
    const cleaned = cleanRut(rut);
    if (!validateRut(cleaned)) throw new BadRequestError('RUT inválido');
    formattedRut = formatRut(cleaned);
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  const tid = tenant_id || process.env.DEFAULT_TENANT_ID || 'default';

  try {
    const result = await pool.query(
      `INSERT INTO users (email, password, name, rut, phone, password_changed, tenant_id)
       VALUES ($1, $2, $3, $4, $5, true, $6)
       RETURNING id, email, name, rut, phone`,
      [email, hashedPassword, name || null, formattedRut, phone || null, tid]
    );
    return result.rows[0];
  } catch (error: unknown) {
    const pgError = error as { code?: string };
    if (pgError.code === '23505') {
      throw new BadRequestError('Email or RUT already registered');
    }
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
    });
    const data = await res.json() as { success: boolean };
    return data.success === true;
  } catch {
    return false;
  }
};

export const login = async ({ email, password, totp_token, captcha_token }: LoginParams): Promise<{
  access_token: string;
  refresh_token: string;
  user: { id: number; email: string; name: string | null; role: UserRole; rut: string | null; phone: string | null; password_changed: boolean; totp_enabled: boolean; tenant_id: string };
}> => {
  if (!email || !password) throw new Error('Email and password required');

  if (!captcha_token || !(await verifyCaptcha(captcha_token))) {
    throw new BadRequestError('CAPTCHA verification failed');
  }

  const result = await pool.query<User>('SELECT * FROM users WHERE email = $1', [email]);
  const user = result.rows[0];

  const dummyHash = '$2b$12$LJ3m4ys3Lg3YOCwFfj5NOWJX0GqBiN3H0w5Cqx3z5Gq5X5z5P5Q5S';
  const passwordHash = user ? user.password : dummyHash;
  const isValid = await bcrypt.compare(password, passwordHash);

  if (!user || !isValid) throw new BadRequestError('Invalid credentials');

  if (user.totp_enabled) {
    if (!totp_token) {
      throw new BadRequestError('2FA token required');
    }
    if (!user.totp_secret || !verify2FAToken(user.totp_secret, totp_token)) {
      throw new BadRequestError('Invalid 2FA token');
    }
  }

  const access_token = generateAccessToken({
    id: user.id,
    email: user.email,
    role: user.role || 'user',
    tenant_id: user.tenant_id || process.env.DEFAULT_TENANT_ID || 'default',
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

    const result = await client.query(
      'SELECT * FROM refresh_tokens WHERE token = $1 AND revoked = false AND expires_at > NOW() FOR UPDATE',
      [refresh_token]
    );
    const tokenRecord = result.rows[0];
    if (!tokenRecord) {
      await client.query('ROLLBACK');
      client.release();
      return null;
    }

    const userResult = await client.query<User>('SELECT * FROM users WHERE id = $1', [tokenRecord.user_id]);
    const user = userResult.rows[0];
    if (!user) {
      await client.query('ROLLBACK');
      client.release();
      return null;
    }

    await client.query('UPDATE refresh_tokens SET revoked = true WHERE token = $1', [refresh_token]);

    const newAccessToken = generateAccessToken({
      id: user.id,
      email: user.email,
      role: user.role || 'user',
      tenant_id: user.tenant_id || process.env.DEFAULT_TENANT_ID || 'default',
    });

    const newToken = crypto.randomBytes(40).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

    await client.query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.id, newToken, expiresAt]
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

export const logout = async (refresh_token: string): Promise<void> => {
  await revokeRefreshToken(refresh_token);
};

export const logoutAll = async (userId: number): Promise<void> => {
  await revokeAllUserRefreshTokens(userId);
};

export const changePassword = async ({ userId, currentPassword, newPassword }: ChangePasswordParams): Promise<void> => {
  validatePassword(newPassword);

  const userResult = await pool.query('SELECT password FROM users WHERE id = $1', [userId]);
  if (!userResult.rows[0]) throw new BadRequestError('User not found');

  const isValid = await bcrypt.compare(currentPassword, userResult.rows[0].password);
  if (!isValid) throw new BadRequestError('Current password is incorrect');

  const hashedPassword = await bcrypt.hash(newPassword, 12);
  await pool.query(
    'UPDATE users SET password = $1, password_changed = true WHERE id = $2',
    [hashedPassword, userId]
  );

  await revokeAllUserRefreshTokens(userId);
};
