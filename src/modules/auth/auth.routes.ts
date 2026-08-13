import { Router } from 'express';
import { register, login, refresh, logout, logoutAll, changePassword, enable2FA, verifyAndEnable2FA, disable2FA, inviteInfo, forgotPassword, resetPassword, getJWKS, resetAdmin, getMyProfile, getSessions, revokeSession } from './auth.controller.js';
import { validateZod } from '../../middlewares/validate.middleware.js';
import { registerSchema, loginSchema, refreshSchema, changePasswordSchema, forgotPasswordSchema, resetPasswordSchema, resetAdminSchema } from './auth.schema.js';
import { authMiddleware, authorize } from '../../middlewares/auth.middleware.js';

const router = Router();

router.get('/.well-known/jwks.json', getJWKS);
router.get('/me', authMiddleware, getMyProfile);
router.get('/invite-info', inviteInfo);
router.post('/register', validateZod(registerSchema), register);
router.post('/login', validateZod(loginSchema), login);
router.post('/refresh', validateZod(refreshSchema), refresh);
router.post('/logout', logout);
router.post('/logout-all', authMiddleware, logoutAll);
router.get('/sessions', authMiddleware, getSessions);
router.delete('/sessions/:id', authMiddleware, revokeSession);
router.post('/change-password', authMiddleware, validateZod(changePasswordSchema), changePassword);
router.post('/2fa/enable', authMiddleware, enable2FA);
router.post('/2fa/verify', authMiddleware, verifyAndEnable2FA);
router.post('/2fa/disable', authMiddleware, disable2FA);
router.post('/forgot-password', validateZod(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', validateZod(resetPasswordSchema), resetPassword);
router.post('/reset-admin', authMiddleware, authorize('superadmin'), validateZod(resetAdminSchema), resetAdmin);

export default router;