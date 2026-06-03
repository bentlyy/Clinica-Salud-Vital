import { Request, Response } from 'express';
import * as authService from './auth.service.js';
import * as auth2faService from './auth-2fa.service.js';
import * as authPasswordService from './auth-password.service.js';
import { asyncHandler } from '../../middlewares/asyncHandler.middleware.js';
import { verifyInviteToken } from '../doctor/doctor.service.js';

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

export const inviteInfo = asyncHandler(async (req: Request, res: Response) => {
  const { token } = req.query;
  if (!token || typeof token !== 'string') {
    res.status(400).json({ error: 'Token requerido' });
    return;
  }
  const data = verifyInviteToken(token);
  res.json({ email: data.email, name: data.name, role: data.role, specialty: data.specialty });
});

export const register = asyncHandler(async (req: Request, res: Response) => {
  const user = await authService.register({ ...req.body, tenant_id: req.tenant_id });
  res.status(201).json(user);
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const data = await authService.login(req.body, req.tenant_id);
  setAuthCookies(res, data.access_token, data.refresh_token);
  res.json(data);
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const refresh_token = req.body.refresh_token || req.cookies?.refresh_token;
  if (!refresh_token) {
    res.status(400).json({ error: 'Refresh token required' });
    return;
  }
  const data = await authService.refreshToken({ refresh_token });
  if (!data) {
    clearAuthCookies(res);
    res.status(401).json({ error: 'Invalid or expired refresh token' });
    return;
  }
  setAuthCookies(res, data.access_token, data.refresh_token);
  res.json(data);
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
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  clearAuthCookies(res);
  await authService.logoutAll(req.user.id);
  res.json({ message: 'Logged out from all devices' });
});

export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
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
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  const result = await auth2faService.enable2FA(req.user.id, req.user.email);
  res.json(result);
});

export const verifyAndEnable2FA = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  await auth2faService.verifyAndEnable2FA(req.user.id, req.body.token);
  res.json({ message: '2FA enabled successfully' });
});

export const disable2FA = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  if (!req.body.password) {
    res.status(400).json({ error: 'Password is required to disable 2FA' });
    return;
  }
  await auth2faService.disable2FA(req.user.id, req.body.password);
  res.json({ message: '2FA disabled successfully' });
});

export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  await authPasswordService.forgotPassword(req.body.email, req.tenant_id);
  res.json({ message: 'If the email exists, a reset link has been sent' });
});

export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  await authPasswordService.resetPassword(req.body.token, req.body.email, req.body.password, req.tenant_id);
  res.json({ message: 'Password reset successfully' });
});
