import { Router } from 'express';
import { authMiddleware, authorize } from '../../middlewares/auth.middleware.js';
import { validateZod } from '../../middlewares/validate.middleware.js';
import * as saasController from './saas.controller.js';
import { checkoutSchema, changePlanSchema, onboardSchema } from './saas.schema.js';

const router = Router();

router.post('/webhook/stripe', saasController.stripeWebhook);

router.get('/plans', saasController.getPlans);

router.post('/onboard', validateZod(onboardSchema), saasController.onboardTenant);

router.use(authMiddleware);

router.get('/subscription', saasController.getMySubscription);
router.post('/checkout', validateZod(checkoutSchema), saasController.createCheckout);
router.post('/change-plan', authorize('admin', 'superadmin'), validateZod(changePlanSchema), saasController.changePlan);
router.post('/cancel', authorize('admin', 'superadmin'), saasController.cancelSubscription);
router.get('/usage', saasController.getUsage);
router.get('/usage/summary', saasController.getUsageSummary);
router.get('/limits', saasController.getLimits);

export default router;
