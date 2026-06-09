import { pool } from '../../shared/db.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { getJWTSecret } from '../../shared/jwt.js';
import { sendEmail } from '../../shared/email.service.js';
import { BadRequestError, NotFoundError } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';
import { hashToken } from '../../shared/crypto.service.js';

const RESET_TOKEN_EXPIRY = '1h';

export const forgotPassword = async (email: string, tenantId: string): Promise<void> => {
  const result = await pool.query(
    `SELECT id, email, name FROM users WHERE email = $1 AND active = true AND tenant_id = $2`,
    [email, tenantId]
  );

  if (result.rows.length === 0) {
    return;
  }

  const user = result.rows[0];
  const resetToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(resetToken);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await pool.query(
    `INSERT INTO password_reset_tokens (user_id, token, expires_at)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id) DO UPDATE SET token = EXCLUDED.token, expires_at = EXCLUDED.expires_at, used = false`,
    [user.id, tokenHash, expiresAt]
  );

  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;

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
