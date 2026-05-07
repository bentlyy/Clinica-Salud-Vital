// src/modules/auth/auth.routes.ts
import { Router } from 'express';
import { register, login } from './auth.controller';
import { validateZod } from '../../middlewares/validate.middleware';
import { registerSchema, loginSchema } from './auth.schema';

const router = Router();

router.post('/register', validateZod(registerSchema), register);
router.post('/login', validateZod(loginSchema), login);

export default router;

