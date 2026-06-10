import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { authorizeRoles } from '../../middlewares/role.middleware.js';
import { exportMyData, deleteMyData, getMyConsents, updateConsent, erasePatientData, getPatientDataExport } from './compliance.controller.js';

const router = Router();

router.get('/export', authMiddleware, exportMyData);
router.delete('/erase', authMiddleware, deleteMyData);
router.get('/consents', authMiddleware, getMyConsents);
router.post('/consents', authMiddleware, updateConsent);

router.delete('/patients/:id/erase', authMiddleware, authorizeRoles('admin'), erasePatientData);
router.get('/patients/:id/export', authMiddleware, authorizeRoles('admin', 'doctor'), getPatientDataExport);

export default router;
