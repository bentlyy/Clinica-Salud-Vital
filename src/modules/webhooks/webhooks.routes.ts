import { Router } from 'express';
import { authMiddleware, authorize } from '../../middlewares/auth.middleware.js';
import { validateZod } from '../../middlewares/validate.middleware.js';
import { listCtrl, createCtrl, updateCtrl, deleteCtrl } from './webhooks.controller.js';
import { createWebhookSchema, updateWebhookSchema, webhookIdSchema } from './webhooks.schema.js';

const router = Router();

router.use(authMiddleware);
router.use(authorize('admin', 'superadmin'));

router.get('/', listCtrl);
router.post('/', validateZod(createWebhookSchema), createCtrl);
router.put('/:id', validateZod(webhookIdSchema, 'params'), validateZod(updateWebhookSchema), updateCtrl);
router.delete('/:id', validateZod(webhookIdSchema, 'params'), deleteCtrl);

export default router;
