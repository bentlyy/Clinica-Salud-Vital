import { Request, Response } from 'express';
import * as authService from './auth.service.js';
import { asyncHandler } from '../../middlewares/asyncHandler.middleware.js';
import { verifyInviteToken } from '../doctor/doctor.service.js';
import { BadRequestError } from '../../utils/errors.js';
import { E } from '../../utils/error-codes.js';

// SSO: Vitaria ya no valida credenciales, ni emite tokens, ni gestiona 2FA o
// sesiones — todo eso lo hace el Core (ver src/sso/amgSso.ts). Solo se conserva
// el alta por invitación de personal (doctores, laboratorio), que crea la cuenta
// local; el usuario entra después vía SSO.

export const inviteInfo = asyncHandler(async (req: Request, res: Response) => {
  const { token } = req.query;
  if (!token || typeof token !== 'string') {
    throw new BadRequestError(E.AUTH_TOKEN_REQUIRED);
  }
  const data = verifyInviteToken(token);
  res.json({ email: data.email, name: data.name, role: data.role, specialty: data.specialty, tenant_id: data.tenant_id });
});

export const register = asyncHandler(async (req: Request, res: Response) => {
  // El tenant NUNCA se toma del cliente (body/header): lo resuelve el token de
  // invitación firmado o, en su defecto, el tenant por defecto del servidor.
  const user = await authService.register({ ...req.body });
  res.status(201).json(user);
});
