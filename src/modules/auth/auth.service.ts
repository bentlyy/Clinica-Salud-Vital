import { pool } from '../../shared/db.js';
import bcrypt from 'bcrypt';
import { validateRut, cleanRut, formatRut } from '../../shared/rut.js';
import { jwtManager } from '../../shared/jwt.service.js';
import { verifyInviteToken } from '../doctor/doctor.service.js';
import { UserRole } from '../../types/index.js';
import { BadRequestError, NotFoundError, UnauthorizedError } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';
import crypto from 'crypto';
import { hashToken, encrypt, decrypt } from '../../shared/crypto.service.js';
import { sendEmail } from '../../shared/email.service.js';
import { base32Encode, base32Decode } from '../../shared/base32.js';

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
  return jwtManager.sign(
    { id: user.id, role: user.role || 'user', tenant_id: user.tenant_id, token_version: user.token_version || 0 },
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
};

const generateRefreshToken = async (userId: number): Promise<string> => {
  const token = crypto.randomBytes(40).toString('hex');
  const tokenHash = hashToken(token);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

  await pool.query(
    'INSERT INTO refresh_tokens (user_id, token, expires_at, token_version) VALUES ($1, $2, $3, (SELECT COALESCE(token_version, 0) FROM users WHERE id = $4))',
    [userId, tokenHash, expiresAt, userId]
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
  if (!token) {
    logger.warn('reCAPTCHA secret configured but no token provided — skipping verification');
    return true;
  }
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

export const login = async ({ email, password, totp_token, captcha_token }: LoginParams, tenantId: string = 'default'): Promise<{
  access_token: string;
  refresh_token: string;
  user: { id: number; email: string; name: string | null; role: UserRole; rut: string | null; phone: string | null; password_changed: boolean; totp_enabled: boolean; tenant_id: string };
}> => {
  if (!email || !password) throw new BadRequestError('Email and password required');

  if (!(await verifyCaptcha(captcha_token || ''))) {
    throw new BadRequestError('CAPTCHA verification failed');
  }

  logger.debug('Login attempt', { email, tenantId });

  const result = await pool.query<User>(
    `SELECT id, email, name, rut, phone, role, password, password_changed, totp_enabled, totp_secret, tenant_id, active, last_activity_at, failed_attempts, locked_until, token_version
     FROM users
     WHERE email = $1 AND (tenant_id = $2 OR (role = 'superadmin' AND tenant_id IS NULL))`,
    [email, tenantId]
  );
  const user = result.rows[0];

  if (!user) {
    const dummyHash = '$2b$12$LJ3m4ys3Lg3YOCwFfj5NOWJX0GqBiN3H0w5Cqx3z5Gq5X5z5P5Q5S';
    await bcrypt.compare(password, dummyHash);
    logger.warn('Login failed: user not found', { email, tenantId });
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
    logger.warn('Login failed: wrong password', { email, tenantId, userId: user.id });
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
      const err = new BadRequestError('2FA token required');
      (err as any).code = '2FA_REQUIRED';
      throw err;
    }
    if (!user.totp_secret || !verifyToken(user.totp_secret, totp_token)) {
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
  user: { id: number; email: string; name: string | null; role: string; rut: string | null; phone: string | null; password_changed: boolean; totp_enabled: boolean; tenant_id: string };
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

    const userResult = await client.query<User>('SELECT id, email, name, rut, phone, role, password, password_changed, totp_enabled, totp_secret, tenant_id, active, last_activity_at, failed_attempts, locked_until, token_version FROM users WHERE id = $1 AND active = true', [tokenRecord.user_id]);
    const user = userResult.rows[0];
    if (!user) {
      await client.query('ROLLBACK');
      return null;
    }

    const currentTokenVersion = user.token_version || 0;
    const refreshTokenVersion = tokenRecord.token_version || 0;
    if (currentTokenVersion !== refreshTokenVersion) {
      await client.query('UPDATE refresh_tokens SET revoked = true WHERE id = $1', [tokenRecord.id]);
      await client.query('COMMIT');
      return null;
    }

    if (user.last_activity_at) {
      const inactiveMinutes = (Date.now() - new Date(user.last_activity_at).getTime()) / 60000;
      if (inactiveMinutes > 30) {
        logger.info('Long inactive session refreshed', { userId: user.id, inactiveMinutes: Math.round(inactiveMinutes) });
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
      'INSERT INTO refresh_tokens (user_id, token, expires_at, token_version) VALUES ($1, $2, $3, $4)',
      [user.id, newTokenHash, expiresAt, user.token_version || 0]
    );

    await client.query('COMMIT');

    return {
      access_token: newAccessToken,
      refresh_token: newToken,
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
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const logout = async (refresh_token: string, userId?: number): Promise<void> => {
  const tokenHash = hashToken(refresh_token);
  if (userId) {
    await pool.query(
      'UPDATE refresh_tokens SET revoked = true WHERE token = $1 AND user_id = $2 AND revoked = false',
      [tokenHash, userId]
    );
  } else {
    await revokeRefreshToken(refresh_token);
  }
};

export const logoutAll = async (userId: number): Promise<void> => {
  await revokeAllUserRefreshTokens(userId);
};

export const changePassword = async ({ userId, currentPassword, newPassword }: ChangePasswordParams, tenantId: string = 'default'): Promise<void> => {
  validatePassword(newPassword);

  const userResult = await pool.query(
    `SELECT password FROM users
     WHERE id = $1 AND (tenant_id = $2 OR (role = 'superadmin' AND tenant_id IS NULL))`,
    [userId, tenantId]
  );
  if (!userResult.rows[0]) throw new BadRequestError('User not found');

  const isValid = await bcrypt.compare(currentPassword, userResult.rows[0].password);
  if (!isValid) throw new BadRequestError('Current password is incorrect');

  if (currentPassword === newPassword) {
    throw new BadRequestError('New password must be different from current password');
  }

  const hashedPassword = await bcrypt.hash(newPassword, 12);
  await pool.query(
    `UPDATE users SET password = $1, password_changed = true, token_version = COALESCE(token_version, 0) + 1
     WHERE id = $2 AND (tenant_id = $3 OR (role = 'superadmin' AND tenant_id IS NULL))`,
    [hashedPassword, userId, tenantId]
  );

  await revokeAllUserRefreshTokens(userId);
};

// ============================================================
// 2FA
// ============================================================

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

  let decryptedSecret = secret;
  if (secret.includes(':')) {
    try { decryptedSecret = decrypt(secret); } catch { return false; }
  }

  const key = base32Decode(decryptedSecret);
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
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { secret, qrCodeUrl } = generateSecret(email);
    const encryptedSecret = encrypt(secret);
    await client.query(
      'UPDATE users SET totp_secret = $1, totp_enabled = false WHERE id = $2',
      [encryptedSecret, userId]
    );
    await client.query('COMMIT');
    return { secret, qrCodeUrl };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const verifyAndEnable2FA = async (userId: number, token: string): Promise<boolean> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query('SELECT totp_secret FROM users WHERE id = $1 FOR UPDATE', [userId]);
    const storedSecret = result.rows[0]?.totp_secret;
    if (!storedSecret) {
      await client.query('ROLLBACK');
      throw new BadRequestError('2FA not initialized');
    }

    const isValid = verifyToken(storedSecret, token);
    if (!isValid) {
      await client.query('ROLLBACK');
      throw new BadRequestError('Invalid 2FA token');
    }

    await client.query('UPDATE users SET totp_enabled = true WHERE id = $1', [userId]);
    await client.query('COMMIT');
    return true;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const disable2FA = async (userId: number, password: string, totpToken?: string): Promise<void> => {
  if (!password) throw new BadRequestError('Password is required to disable 2FA');

  const userResult = await pool.query('SELECT password, totp_secret FROM users WHERE id = $1', [userId]);
  if (!userResult.rows[0]) throw new BadRequestError('User not found');

  const isValid = await bcrypt.compare(password, userResult.rows[0].password);
  if (!isValid) throw new UnauthorizedError('Current password is incorrect');

  if (userResult.rows[0].totp_secret) {
    if (!totpToken) {
      throw new BadRequestError('Código TOTP requerido para deshabilitar 2FA. Ingresa el código de tu app de autenticación.');
    }
    if (!verifyToken(userResult.rows[0].totp_secret, totpToken)) {
      throw new BadRequestError('Código TOTP inválido');
    }
  }

  await pool.query(
    'UPDATE users SET totp_secret = NULL, totp_enabled = false WHERE id = $1',
    [userId]
  );
};

export const is2FARequired = async (userId: number): Promise<boolean> => {
  const result = await pool.query('SELECT totp_enabled FROM users WHERE id = $1', [userId]);
  return result.rows[0]?.totp_enabled === true;
};

// ============================================================
// PASSWORD RESET
// ============================================================

const RESET_TOKEN_EXPIRY = '1h';

export const forgotPassword = async (email: string, tenantId: string): Promise<void> => {
  const startTime = Date.now();

  const result = await pool.query(
    `SELECT id, email, name FROM users WHERE email = $1 AND active = true AND tenant_id = $2`,
    [email, tenantId]
  );

  const user = result.rows[0];

  if (user) {
    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashToken(resetToken);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await pool.query(
      `INSERT INTO password_reset_tokens (user_id, token, expires_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id) DO UPDATE SET token = EXCLUDED.token, expires_at = EXCLUDED.expires_at, used = false`,
      [user.id, tokenHash, expiresAt]
    );

    const frontendUrl = process.env.FRONTEND_URL || process.env.RENDER_EXTERNAL_URL || 'http://localhost:5173';
    const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;

    try {
      await sendEmail({
        to: email,
        subject: 'Restablecimiento de contraseña',
        html: `
          <h2>Restablecimiento de contraseña</h2>
          <p>Haz clic en el siguiente enlace para restablecer tu contraseña. Este enlace expira en 1 hora.</p>
          <p><a href="${resetUrl}">Restablecer contraseña</a></p>
          <p>Si no solicitaste este cambio, ignora este mensaje.</p>
        `,
        tenantId,
      });
    } catch (err) {
      logger.error('Error sending password reset email', { error: (err as Error).message });
    }
  }

  const elapsed = Date.now() - startTime;
  const minTime = 200;
  if (elapsed < minTime) {
    await new Promise(resolve => setTimeout(resolve, minTime - elapsed));
  }
};

export const resetPassword = async (token: string, email: string, newPassword: string, tenantId: string): Promise<void> => {
  if (newPassword.length < 8) throw new BadRequestError('Password must be at least 8 characters');
  if (!/[A-Z]/.test(newPassword)) throw new BadRequestError('Password must contain at least one uppercase letter');
  if (!/[a-z]/.test(newPassword)) throw new BadRequestError('Password must contain at least one lowercase letter');
  if (!/[0-9]/.test(newPassword)) throw new BadRequestError('Password must contain at least one number');
  if (!/[^A-Za-z0-9]/.test(newPassword)) throw new BadRequestError('Password must contain at least one special character');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const tokenHash = hashToken(token);
    const result = await client.query(
      'SELECT * FROM password_reset_tokens WHERE token = $1 AND used = false AND expires_at > NOW() FOR UPDATE',
      [tokenHash]
    );

    if (result.rows.length === 0) {
      throw new BadRequestError('Invalid or expired reset token');
    }

    const tokenRecord = result.rows[0];

    const userResult = await client.query(
      `SELECT id, email FROM users WHERE id = $1 AND active = true AND tenant_id = $2`,
      [tokenRecord.user_id, tenantId]
    );

    if (userResult.rows.length === 0) {
      throw new NotFoundError('User not found');
    }

    if (userResult.rows[0].email !== email) {
      throw new BadRequestError('Email does not match reset token');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await client.query(
      'UPDATE users SET password = $1, password_changed = true, token_version = COALESCE(token_version, 0) + 1, failed_attempts = 0, locked_until = NULL WHERE id = $2',
      [hashedPassword, tokenRecord.user_id]
    );

    await client.query('UPDATE refresh_tokens SET revoked = true WHERE user_id = $1', [tokenRecord.user_id]);
    await client.query('UPDATE password_reset_tokens SET used = true WHERE id = $1', [tokenRecord.id]);

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const resetAdminPassword = async (tenantId: string): Promise<{ email: string }> => {
  const email = process.env.ADMIN_EMAIL || 'admin@clinic.com';
  const password = process.env.SEED_PASSWORD ?? process.env.ADMIN_PASSWORD;
  if (!password) throw new Error('SEED_PASSWORD or ADMIN_PASSWORD environment variable is required');
  const hash = await bcrypt.hash(password, 12);

  const result = await pool.query(
    `INSERT INTO users (email, password, name, role, rut, tenant_id)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (tenant_id, email)
     DO UPDATE SET password = EXCLUDED.password, failed_attempts = 0, locked_until = NULL
     RETURNING id`,
    [email, hash, 'Admin', 'admin', '20287886-5', tenantId]
  );

  await pool.query('UPDATE refresh_tokens SET revoked = true WHERE user_id = $1', [result.rows[0].id]);

  logger.info('Admin password reset', { email, tenantId });
  return { email };
};
