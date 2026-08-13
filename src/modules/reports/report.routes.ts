import { Router } from 'express';
import { authMiddleware, authorize } from '../../middlewares/auth.middleware.js';
import { validateZod } from '../../middlewares/validate.middleware.js';
import { getAvailable, generate, getById, downloadPdf } from './report.controller.js';
import { z } from 'zod';

const router = Router();

const generateReportSchema = z.object({
  report_type: z.enum(['monthly', 'yearly', 'doctor-performance', 'service-utilization']),
  doctor_id: z.number().int().positive().optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
}).strict();

router.use(authMiddleware);
router.use(authorize('admin', 'superadmin'));

router.get('/available', getAvailable);
router.post('/generate', validateZod(generateReportSchema), generate);
router.get('/:id/pdf', downloadPdf);
router.get('/:id', getById);

export default router;
