import { Router } from 'express';
import { authMiddleware, authorize } from '../../middlewares/auth.middleware.js';
import { validateZod } from '../../middlewares/validate.middleware.js';
import { getMedicalHistory, getMedicalHistoryByPatient, createMedicalHistory, updateMedicalHistory } from './medical-history.controller.js';
import { z } from 'zod';

const router = Router();

const createMedicalHistorySchema = z.object({
  patient_id: z.number().int().positive(),
  condition: z.string().min(1).max(500),
  onset_date: z.string().datetime().optional(),
  status: z.enum(['active', 'resolved', 'chronic']),
  notes: z.string().max(2000).optional(),
}).strict();

const updateMedicalHistorySchema = z.object({
  condition: z.string().min(1).max(500).optional(),
  onset_date: z.string().datetime().optional(),
  status: z.enum(['active', 'resolved', 'chronic']).optional(),
  notes: z.string().max(2000).optional(),
}).strict();

router.use(authMiddleware);
router.get('/patient/:patientId', authorize('doctor', 'admin', 'user', 'patient', 'superadmin'), getMedicalHistoryByPatient);
router.get('/', authorize('doctor', 'admin', 'user', 'patient', 'superadmin'), getMedicalHistory);
router.post('/', authorize('doctor', 'admin', 'superadmin'), validateZod(createMedicalHistorySchema), createMedicalHistory);
router.patch('/:id', authorize('doctor', 'admin', 'superadmin'), validateZod(updateMedicalHistorySchema), updateMedicalHistory);

export default router;
