import { Router } from 'express';
import { register, inviteInfo } from './auth.controller.js';
import { validateZod } from '../../middlewares/validate.middleware.js';
import { registerSchema } from './auth.schema.js';

const router = Router();

// SSO: el login, el logout, el perfil y las sesiones los maneja el Core
// (ver src/sso/amgSso.ts). Vitaria ya no emite tokens ni valida contraseñas.
// Solo se conserva el alta por invitación de personal (doctores, laboratorio),
// que crea la cuenta local; el usuario entra luego vía SSO con el Core.
router.get('/invite-info', inviteInfo);
router.post('/register', validateZod(registerSchema), register);

export default router;
