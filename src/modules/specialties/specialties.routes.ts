import { Router } from 'express';
import { authMiddleware, authorize } from '../../middlewares/auth.middleware.js';
import { validateZod } from '../../middlewares/validate.middleware.js';
import { getSpecialties, getSpecialtyById, createSpecialty, updateSpecialty, deleteSpecialty } from './specialties.controller.js';
import { z } from 'zod';

const router = Router();

const specialtySchema = z.object({
  name: z.string().min(1).max(200),
  icon: z.string().min(1).max(100).optional(),
  description: z.string().max(2000).optional(),
  department: z.string().max(200).optional(),
  procedures: z.array(z.string()).optional(),
  color: z.string().max(50).optional(),
  doctors: z.array(z.object({
    name: z.string(),
    email: z.string().email(),
  })).optional(),
}).strict();

const specialtyUpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  icon: z.string().min(1).max(100).optional(),
  description: z.string().max(2000).optional(),
  department: z.string().max(200).optional(),
  procedures: z.array(z.string()).optional(),
  color: z.string().max(50).optional(),
  doctors: z.array(z.object({
    name: z.string(),
    email: z.string().email(),
  })).optional(),
}).strict();

router.get('/', getSpecialties);
router.get('/:id', getSpecialtyById);
router.post('/', authMiddleware, authorize('admin', 'superadmin'), validateZod(specialtySchema), createSpecialty);
router.put('/:id', authMiddleware, authorize('admin', 'superadmin'), validateZod(specialtyUpdateSchema), updateSpecialty);
router.delete('/:id', authMiddleware, authorize('admin', 'superadmin'), deleteSpecialty);

export default router;
