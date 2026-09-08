import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authMiddleware, authorize } from '../../middlewares/auth.middleware.js';
import { validateZod } from '../../middlewares/validate.middleware.js';
import * as saasController from './saas.controller.js';
import { onboardSchema, checkoutSchema, changePlanSchema } from './saas.schema.js';
import {
  updateOnboardingProfileSchema,
  onboardingDocumentSchema,
  onboardingDocumentIdSchema,
  onboardingIdSchema,
  rejectOnboardingSchema,
  listOnboardingApplicationsQuerySchema,
} from './onboarding.schema.js';

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
router.post('/checkout', authorize('admin', 'superadmin'), validateZod(checkoutSchema), saasController.createCheckout);
router.post('/change-plan', authorize('admin', 'superadmin'), validateZod(changePlanSchema), saasController.changePlan);
router.post('/cancel', authorize('admin', 'superadmin'), saasController.cancelSubscription);
router.get('/usage', authorize('admin', 'superadmin'), saasController.getUsage);
router.get('/usage/summary', authorize('admin', 'superadmin'), saasController.getUsageSummary);
router.get('/limits', authorize('admin', 'superadmin'), saasController.getLimits);
router.get('/features', saasController.getFeatures);
router.patch('/tenant', authorize('admin', 'superadmin'), saasController.updateTenantConfig);

// ── Onboarding: perfil y documentos (clínica autenticada) ─
router.get('/onboarding', authorize('admin', 'superadmin'), saasController.getMyOnboarding);
router.patch('/onboarding', authorize('admin', 'superadmin'), validateZod(updateOnboardingProfileSchema), saasController.updateMyOnboarding);
router.post('/onboarding/documents', authorize('admin', 'superadmin'), validateZod(onboardingDocumentSchema), saasController.uploadOnboardingDocument);
router.get('/onboarding/documents', authorize('admin', 'superadmin'), saasController.listMyOnboardingDocuments);
router.get('/onboarding/documents/:id/download', authorize('admin', 'superadmin'), validateZod(onboardingDocumentIdSchema, 'params'), saasController.downloadOnboardingDocument);
router.delete('/onboarding/documents/:id', authorize('admin', 'superadmin'), validateZod(onboardingDocumentIdSchema, 'params'), saasController.deleteOnboardingDocument);

// ── Onboarding: aplicaciones (panel superadmin) ───────────
router.get('/onboarding/applications', authorize('superadmin'), validateZod(listOnboardingApplicationsQuerySchema, 'query'), saasController.listOnboardingApplications);
router.get('/onboarding/applications/:id', authorize('superadmin'), validateZod(onboardingIdSchema, 'params'), saasController.getOnboardingApplication);
router.patch('/onboarding/applications/:id/approve', authorize('superadmin'), validateZod(onboardingIdSchema, 'params'), saasController.approveOnboardingApplication);
router.patch('/onboarding/applications/:id/reject', authorize('superadmin'), validateZod(onboardingIdSchema, 'params'), validateZod(rejectOnboardingSchema), saasController.rejectOnboardingApplication);

export default router;
