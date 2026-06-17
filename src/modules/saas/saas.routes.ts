import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authMiddleware, authorize } from '../../middlewares/auth.middleware.js';
import { validateZod } from '../../middlewares/validate.middleware.js';
import * as saasController from './saas.controller.js';
import { onboardSchema } from './saas.schema.js';

const router = Router();

const onboardLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: { error: 'Too many onboard attempts, please try again later' },
  keyGenerator: (req) => req.ip || 'unknown',
});

router.post('/webhook/stripe', saasController.stripeWebhook);

router.get('/plans', saasController.getPlans);

router.post('/onboard', onboardLimiter, validateZod(onboardSchema), saasController.onboardTenant);

router.use(authMiddleware);

router.get('/subscription', authorize('admin', 'superadmin'), saasController.getMySubscription);
router.post('/checkout', authorize('admin', 'superadmin'), saasController.createCheckout);
router.post('/change-plan', authorize('admin', 'superadmin'), saasController.changePlan);
router.post('/cancel', authorize('admin', 'superadmin'), saasController.cancelSubscription);
router.get('/usage', authorize('admin', 'superadmin'), saasController.getUsage);
router.get('/usage/summary', authorize('admin', 'superadmin'), saasController.getUsageSummary);
router.get('/limits', authorize('admin', 'superadmin'), saasController.getLimits);
router.get('/features', saasController.getFeatures);
router.patch('/tenant', authorize('admin', 'superadmin'), saasController.updateTenantConfig);

export default router;
