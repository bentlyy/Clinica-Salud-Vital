import { Request, Response } from 'express';
import * as authService from './auth.service.js';
import * as auth2faService from './auth-2fa.service.js';
import { asyncHandler } from '../../middlewares/asyncHandler.middleware.js';

export const register = asyncHandler(async (req: Request, res: Response) => {
  const user = await authService.register({ ...req.body, tenant_id: req.tenant_id });
  res.status(201).json(user);
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const data = await authService.login(req.body);
  res.json(data);
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const { refresh_token } = req.body;
  if (!refresh_token) {
    res.status(400).json({ error: 'Refresh token required' });
    return;
  }
  const data = await authService.refreshToken({ refresh_token });
  if (!data) {
    res.status(401).json({ error: 'Invalid or expired refresh token' });
    return;
  }
  res.json(data);
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const { refresh_token } = req.body;
  if (refresh_token) {
    await authService.logout(refresh_token);
  }
  res.json({ message: 'Logged out successfully' });
});

export const logoutAll = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
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
  });
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
  await auth2faService.disable2FA(req.user.id);
  res.json({ message: '2FA disabled successfully' });
});
