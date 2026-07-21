import { Router } from 'express';
import { authMiddleware, authorize } from '../../middlewares/auth.middleware.js';
import { getMedicalHistory, createMedicalHistory, updateMedicalHistory } from './medical-history.controller.js';

const router = Router();

router.use(authMiddleware);
router.get('/', authorize('doctor', 'admin', 'user', 'patient', 'superadmin'), getMedicalHistory);
router.post('/', authorize('doctor', 'admin', 'superadmin'), createMedicalHistory);
router.patch('/:id', authorize('doctor', 'admin', 'superadmin'), updateMedicalHistory);

export default router;
