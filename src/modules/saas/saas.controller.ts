import { Request, Response } from 'express';
import { asyncHandler } from '../../middlewares/asyncHandler.middleware.js';
import * as saasService from './saas.service.js';
import { BadRequestError } from '../../utils/errors.js';
import { E } from '../../utils/error-codes.js';
import { logger } from '../../utils/logger.js';

export const getPlans = asyncHandler(async (_req: Request, res: Response) => {
  const plans = await saasService.getPlans();
  res.json({ data: plans });
});

export const getMySubscription = asyncHandler(async (req: Request, res: Response) => {
  const subscription = await saasService.getTenantSubscription(req.tenant_id);
  const plan = await saasService.getTenantPlan(req.tenant_id);
  res.json({ subscription, plan });
});

export const createCheckout = asyncHandler(async (req: Request, res: Response) => {
  const { plan_code } = req.body;
  if (!plan_code) throw new BadRequestError(E.SAAS_PLAN_REQUIRED);

  // Check plan exists
  await saasService.getPlanByCode(plan_code);

  // Create subscription directly (MVP: no Stripe)
  const subscription = await saasService.createSubscription(req.tenant_id, plan_code);

  res.status(201).json({
    subscription,
    url: `/saas/success?plan=${plan_code}&tenant=${req.tenant_id}`,
    message: `Subscription created for plan '${plan_code}'`,
  });
});

export const stripeWebhook = asyncHandler(async (req: Request, res: Response) => {
  // MVP: webhook stub — in production, verify Stripe signature and handle events
  const event = req.body;
  logger.info('[Stripe Webhook] Received event:', event?.type || 'unknown');
  res.json({ received: true });
});

export const changePlan = asyncHandler(async (req: Request, res: Response) => {
  const { plan_code } = req.body;
  if (!plan_code) throw new BadRequestError(E.SAAS_PLAN_REQUIRED);

  const result = await saasService.changePlan(req.tenant_id, plan_code);
  res.json(result);
});

export const cancelSubscription = asyncHandler(async (req: Request, res: Response) => {
  const result = await saasService.cancelSubscription(req.tenant_id);
  res.json(result);
});

export const getUsage = asyncHandler(async (req: Request, res: Response) => {
  const usage = await saasService.getTenantUsage(req.tenant_id);
  res.json({ usage });
});

export const getUsageSummary = asyncHandler(async (req: Request, res: Response) => {
  const summary = await saasService.getUsageSummary(req.tenant_id);
  res.json({ summary });
});

const verifyCaptchaOnboard = async (token: string): Promise<boolean> => {
  const secret = process.env.RECAPTCHA_SECRET_KEY;
  if (!secret) return true;
  if (!token) {
    logger.warn('reCAPTCHA secret configured but no token provided — blocking request');
    return false;
  }
  try {
    const params = new URLSearchParams({ secret, response: token });
    const res = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      body: params,
      signal: AbortSignal.timeout(5000),
    });
    const data = await res.json() as { success: boolean };
    return data.success === true;
  } catch {
    return false;
  }
};

export const onboardTenant = asyncHandler(async (req: Request, res: Response) => {
  if (!(await verifyCaptchaOnboard(req.body.captcha_token || ''))) {
    throw new BadRequestError(E.SAAS_CAPTCHA_FAILED);
  }
  const result = await saasService.onboardTenant({
    tenantName: req.body.tenant_name,
    domain: req.body.domain,
    adminEmail: req.body.admin_email,
    adminPassword: req.body.admin_password,
    adminName: req.body.admin_name,
    locale: req.body.locale,
    timezone: req.body.timezone,
    planCode: req.body.plan_code || 'free',
  });
  res.status(201).json(result);
});

export const getLimits = asyncHandler(async (req: Request, res: Response) => {
  const [doctors, patients, storage] = await Promise.all([
    saasService.checkLimits(req.tenant_id, 'doctors'),
    saasService.checkLimits(req.tenant_id, 'patients'),
    saasService.checkLimits(req.tenant_id, 'storage'),
  ]);
  res.json({ doctors, patients, storage });
});

export const getFeatures = asyncHandler(async (req: Request, res: Response) => {
  const features = await saasService.getTenantFeatures(req.tenant_id);
  res.json({ features });
});

export const updateTenantConfig = asyncHandler(async (req: Request, res: Response) => {
  const allowed = ['name', 'locale', 'timezone', 'config'];
  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }
  if (Object.keys(updates).length === 0) {
    throw new BadRequestError(E.SAAS_NO_FIELDS);
  }
  await saasService.updateTenantConfig(req.tenant_id, updates);
  res.json({ message: 'Configuration updated' });
});
