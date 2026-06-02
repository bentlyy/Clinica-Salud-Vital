import { Router } from 'express';
import { register, login, refresh, logout, logoutAll, changePassword, enable2FA, verifyAndEnable2FA, disable2FA, inviteInfo } from './auth.controller.js';
import { validateZod } from '../../middlewares/validate.middleware.js';
import { registerSchema, loginSchema, refreshSchema, changePasswordSchema } from './auth.schema.js';
import { authMiddleware } from '../../middlewares/auth.middleware.js';

const router = Router();

router.get('/invite-info', inviteInfo);
router.post('/register', validateZod(registerSchema), register);
router.post('/login', validateZod(loginSchema), login);
router.post('/refresh', validateZod(refreshSchema), refresh);
router.post('/logout', logout);
router.post('/logout-all', authMiddleware, logoutAll);
router.post('/change-password', authMiddleware, validateZod(changePasswordSchema), changePassword);
router.post('/2fa/enable', authMiddleware, enable2FA);
router.post('/2fa/verify', authMiddleware, verifyAndEnable2FA);
router.post('/2fa/disable', authMiddleware, disable2FA);

export default router;

