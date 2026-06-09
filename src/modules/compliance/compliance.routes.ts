import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { exportMyData, deleteMyData, getMyConsents, updateConsent } from './compliance.controller.js';

const router = Router();

router.get('/export', authMiddleware, exportMyData);
router.delete('/erase', authMiddleware, deleteMyData);
router.get('/consents', authMiddleware, getMyConsents);
router.post('/consents', authMiddleware, updateConsent);

export default router;
