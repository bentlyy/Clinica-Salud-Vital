import { Request, Response } from 'express';
import * as authService from './auth.service.js';
import { asyncHandler } from '../../middlewares/asyncHandler.middleware.js';
import { pool } from '../../shared/db.js';
import { verifyInviteToken } from '../doctor/doctor.service.js';
import { waitForSeed } from '../../shared/seed-status.js';
import { logger } from '../../utils/logger.js';
import { BadRequestError, UnauthorizedError } from '../../utils/errors.js';

const ACCESS_COOKIE = 'access_token';
const REFRESH_COOKIE = 'refresh_token';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
};

const setAuthCookies = (res: Response, accessToken: string, refreshToken: string): void => {
  res.cookie(ACCESS_COOKIE, accessToken, { ...COOKIE_OPTIONS, maxAge: 15 * 60 * 1000 });
  res.cookie(REFRESH_COOKIE, refreshToken, { ...COOKIE_OPTIONS, maxAge: 30 * 24 * 60 * 60 * 1000 });
};

const clearAuthCookies = (res: Response): void => {
  res.clearCookie(ACCESS_COOKIE, { path: '/' });
  res.clearCookie(REFRESH_COOKIE, { path: '/' });
};

export const getMyProfile = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }
  const { rows } = await pool.query(
    'SELECT id, name, email, phone, role FROM users WHERE id = $1 AND active = true',
    [req.user.id]
  );
  if (!rows[0]) {
    throw new NotFoundError('User not found');
  }
  res.json(rows[0]);
});

export const inviteInfo = asyncHandler(async (req: Request, res: Response) => {
  const { token } = req.query;
  if (!token || typeof token !== 'string') {
    throw new BadRequestError('Token requerido');
  }
  const data = verifyInviteToken(token);
  res.json({ email: data.email, name: data.name, role: data.role, specialty: data.specialty });
});

export const register = asyncHandler(async (req: Request, res: Response) => {
  const user = await authService.register({ ...req.body, tenant_id: req.body.tenant_id || req.tenant_id });
  res.status(201).json(user);
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const seeded = await waitForSeed(30000);
  if (!seeded) {
    logger.warn('Login request arrived before seed completed — proceeding anyway');
  }
  const data = await authService.login(req.body, req.body.tenant_id || req.tenant_id);
  setAuthCookies(res, data.access_token, data.refresh_token);
  res.json(data);
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const refresh_token = req.body.refresh_token || req.cookies?.refresh_token;
  if (!refresh_token) {
    throw new BadRequestError('Refresh token required');
  }
  const data = await authService.refreshToken({ refresh_token });
  if (!data) {
    clearAuthCookies(res);
    throw new UnauthorizedError('Invalid or expired refresh token');
  }
  setAuthCookies(res, data.access_token, data.refresh_token);
  res.json(data);
});

export const resetAdmin = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.body.tenant_id || req.tenant_id;
  const result = await authService.resetAdminPassword(tenantId);
  logger.warn('Admin password reset endpoint called', { ip: req.ip });
  res.json({ message: 'Admin password reset successfully', email: result.email });
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const refresh_token = req.body.refresh_token || req.cookies?.refresh_token;
  if (refresh_token) {
    await authService.logout(refresh_token, req.user?.id);
  }
  clearAuthCookies(res);
  res.json({ message: 'Logged out successfully' });
});

export const logoutAll = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }
  clearAuthCookies(res);
  await authService.logoutAll(req.user.id);
  res.json({ message: 'Logged out from all devices' });
});

export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }
  await authService.changePassword({
    userId: req.user.id,
    currentPassword: req.body.current_password,
    newPassword: req.body.new_password,
  }, req.tenant_id);
  res.json({ message: 'Password changed successfully' });
});

export const enable2FA = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }
  const { rows } = await pool.query('SELECT email FROM users WHERE id = $1', [req.user.id]);
  const email = rows[0]?.email || 'user';
  const result = await authService.enable2FA(req.user.id, email);
  res.json(result);
});

export const verifyAndEnable2FA = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }
  await authService.verifyAndEnable2FA(req.user.id, req.body.token);
  res.json({ message: '2FA enabled successfully' });
});

export const disable2FA = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }
  if (!req.body.password) {
    throw new BadRequestError('Password is required to disable 2FA');
  }
  await authService.disable2FA(req.user.id, req.body.password, req.body.totp_token);
  res.json({ message: '2FA disabled successfully' });
});

export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  await authService.forgotPassword(req.body.email, req.tenant_id);
  res.json({ message: 'If the email exists, a reset link has been sent' });
});

export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  await authService.resetPassword(req.body.token, req.body.email, req.body.password, req.tenant_id);
  res.json({ message: 'Password reset successfully' });
});

export const getJWKS = asyncHandler(async (_req: Request, res: Response) => {
  const { getJWKS: fetchJWKS } = await import('../../shared/jwt.service.js');
  res.json(fetchJWKS());
});
