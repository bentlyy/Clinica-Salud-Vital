import { Router } from 'express';
import { authMiddleware, authorize } from '../../middlewares/auth.middleware.js';
import { validateZod } from '../../middlewares/validate.middleware.js';
import { createTemplateSchema, updateTemplateSchema, templateIdSchema } from './clinical-template.schema.js';
import {
  getTemplates,
  getTemplateById,
  createTemplate,
  updateTemplate,
  deleteTemplate,
} from './clinical-template.controller.js';

const router = Router();

router.use(authMiddleware);

router.get('/', authorize('doctor', 'admin'), getTemplates);
router.get('/:id', authorize('doctor', 'admin'), validateZod(templateIdSchema, 'params'), getTemplateById);
router.post('/', authorize('doctor', 'admin'), validateZod(createTemplateSchema), createTemplate);
router.put('/:id', authorize('doctor', 'admin'), validateZod(templateIdSchema, 'params'), validateZod(updateTemplateSchema), updateTemplate);
router.delete('/:id', authorize('doctor', 'admin'), validateZod(templateIdSchema, 'params'), deleteTemplate);

export default router;
