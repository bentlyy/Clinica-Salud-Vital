import { Request, Response } from 'express';
import * as authService from './auth.service.js';
import { asyncHandler } from '../../middlewares/asyncHandler.middleware.js';
import { pool } from '../../shared/db.js';
import { verifyInviteToken } from '../doctor/doctor.service.js';
import { waitForSeed } from '../../shared/seed-status.js';
import { logger } from '../../utils/logger.js';
import { BadRequestError, NotFoundError, UnauthorizedError } from '../../utils/errors.js';
import { E } from '../../utils/error-codes.js';
import { listUserSessions, revokeUserSession } from '../../shared/sessions.service.js';

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
    throw new UnauthorizedError(E.AUTH_AUTHENTICATION_REQUIRED);
  }
  const { rows } = await pool.query(
    'SELECT id, name, email, phone, role FROM users WHERE id = $1 AND active = true',
    [req.user.id]
  );
  if (!rows[0]) {
    throw new NotFoundError(E.AUTH_USER_NOT_FOUND);
  }
  res.json(rows[0]);
});

export const inviteInfo = asyncHandler(async (req: Request, res: Response) => {
  const { token } = req.query;
  if (!token || typeof token !== 'string') {
    throw new BadRequestError(E.AUTH_TOKEN_REQUIRED);
  }
  const data = verifyInviteToken(token);
  res.json({ email: data.email, name: data.name, role: data.role, specialty: data.specialty, tenant_id: data.tenant_id });
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
  const data = await authService.login(
    {
      ...req.body,
      ip_address: req.ip,
      user_agent: req.get('user-agent'),
    },
    req.body.tenant_id || req.tenant_id,
  );
  setAuthCookies(res, data.access_token, data.refresh_token);
  res.json(data);
});

export const getSessions = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new UnauthorizedError(E.AUTH_AUTHENTICATION_REQUIRED);
  const sessions = await listUserSessions(req.user.id, req.tenant_id);
  res.json({ data: sessions });
});

export const revokeSession = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new UnauthorizedError(E.AUTH_AUTHENTICATION_REQUIRED);
  const sessionId = Number(req.params.id);
  if (!Number.isInteger(sessionId) || sessionId <= 0) {
    throw new BadRequestError('Invalid session id');
  }
  const revoked = await revokeUserSession(sessionId, req.user.id, req.tenant_id);
  if (!revoked) throw new NotFoundError('Session not found');
  res.json({ message: 'Session revoked successfully' });
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const refresh_token = req.body.refresh_token || req.cookies?.refresh_token;
  logger.info('[REFRESH] attempt', {
    hasBodyToken: !!req.body?.refresh_token,
    hasCookieToken: !!req.cookies?.refresh_token,
    cookiesKeys: Object.keys(req.cookies || {}),
    cookieHeader: req.headers?.cookie ? 'present' : 'missing',
  });
  if (!refresh_token) {
    throw new BadRequestError(E.AUTH_REFRESH_REQUIRED);
  }
  const data = await authService.refreshToken({ refresh_token });
  if (!data) {
    clearAuthCookies(res);
    throw new UnauthorizedError(E.AUTH_REFRESH_INVALID);
  }
  setAuthCookies(res, data.access_token, data.refresh_token);
  res.json(data);
});

export const resetAdmin = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.body.tenant_id || req.tenant_id;
  const { current_password, new_password } = req.body;
  await authService.resetAdminPassword(tenantId, current_password, new_password);
  logger.warn('Admin password reset endpoint called', { ip: req.ip, tenantId });
  res.json({ message: 'Admin password reset successfully' });
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
    throw new UnauthorizedError(E.AUTH_AUTHENTICATION_REQUIRED);
  }
  clearAuthCookies(res);
  await authService.logoutAll(req.user.id);
  res.json({ message: 'Logged out from all devices' });
});

export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new UnauthorizedError(E.AUTH_AUTHENTICATION_REQUIRED);
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
    throw new UnauthorizedError(E.AUTH_AUTHENTICATION_REQUIRED);
  }
  const { rows } = await pool.query('SELECT email FROM users WHERE id = $1', [req.user.id]);
  const email = rows[0]?.email || 'user';
  const result = await authService.enable2FA(req.user.id, email);
  res.json(result);
});

export const verifyAndEnable2FA = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new UnauthorizedError(E.AUTH_AUTHENTICATION_REQUIRED);
  }
  await authService.verifyAndEnable2FA(req.user.id, req.body.token);
  res.json({ message: '2FA enabled successfully' });
});

export const disable2FA = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new UnauthorizedError(E.AUTH_AUTHENTICATION_REQUIRED);
  }
  if (!req.body.password) {
    throw new BadRequestError(E.AUTH_2FA_PASSWORD_REQUIRED);
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
