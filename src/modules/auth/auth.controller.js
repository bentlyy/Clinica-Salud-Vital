import * as authService from './auth.service.js';
import { asyncHandler } from '../../middlewares/asyncHandler.middleware.js';

export const register = asyncHandler(async (req, res) => {
  const user = await authService.register(req.body);
  res.status(201).json(user);
});

export const login = asyncHandler(async (req, res) => {
  const data = await authService.login(req.body);
  res.json(data);
});
