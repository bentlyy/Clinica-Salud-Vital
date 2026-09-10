import { Router } from 'express';
import { authMiddleware, authorize } from '../../middlewares/auth.middleware.js';
import { validateZod } from '../../middlewares/validate.middleware.js';
import { getAvailable, generate, getById, downloadPdf } from './report.controller.js';
import { z } from 'zod';

const router = Router();

const generateReportSchema = z.object({
  type: z.enum(['appointments', 'revenue', 'patients', 'laboratory', 'custom']),
  date_from: z.string().min(1),
  date_to: z.string().min(1),
  filters: z.record(z.string(), z.unknown()).optional(),
}).strict();

router.use(authMiddleware);
router.use(authorize('admin', 'superadmin'));

router.get('/available', getAvailable);
router.post('/generate', validateZod(generateReportSchema), generate);
router.get('/:id/pdf', downloadPdf);
router.get('/:id', getById);

export default router;
