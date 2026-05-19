import { Router } from 'express';
import * as webhookController from './webhook.controller.js';
import { authMiddleware, authorize } from '../../middlewares/auth.middleware.js';
import { validateZod } from '../../middlewares/validate.middleware.js';
import { createWebhookSchema, updateWebhookSchema } from './webhook.schema.js';

const router = Router();

router.use(authMiddleware);
router.use(authorize('admin'));

router.get('/', webhookController.list);
router.post('/', validateZod(createWebhookSchema), webhookController.create);
router.get('/:id', webhookController.getById);
router.put('/:id', validateZod(updateWebhookSchema), webhookController.update);
router.delete('/:id', webhookController.remove);
router.get('/:webhook_id/deliveries', webhookController.getDeliveries);

export default router;
