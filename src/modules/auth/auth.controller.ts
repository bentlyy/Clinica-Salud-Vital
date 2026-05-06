import { Response } from 'express';
import * as authService from './auth.service.js';
import { asyncHandler } from '../../middlewares/asyncHandler.middleware.js';
import { AuthRequest } from '../../middlewares/auth.middleware.js';

export const register = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = await authService.register(req.body);
  res.status(201).json(user);
});

export const login = asyncHandler(async (req: AuthRequest, res: Response) => {
  const data = await authService.login(req.body);
  res.json(data);
});