import { Request, Response } from 'express';
import { asyncHandler } from '../../middlewares/asyncHandler.middleware.js';
import * as saasService from './saas.service.js';
import { BadRequestError } from '../../utils/errors.js';

export const getPlans = asyncHandler(async (_req: Request, res: Response) => {
  const plans = await saasService.getPlans();
  res.json({ data: plans });
});

export const getMySubscription = asyncHandler(async (req: Request, res: Response) => {
  res.json({ subscription: null, plan: await saasService.getTenantPlan() });
});

export const createCheckout = asyncHandler(async (req: Request, res: Response) => {
  const { plan_code } = req.body;
  res.json({
    url: `/saas/success?plan=${plan_code}&tenant=${req.tenant_id}`,
    session_id: 'simulated',
  });
});

export const stripeWebhook = asyncHandler(async (_req: Request, res: Response) => {
  res.json({ received: true });
});

export const changePlan = asyncHandler(async (_req: Request, res: Response) => {
  const result = await saasService.changePlan();
  res.json(result);
});

export const cancelSubscription = asyncHandler(async (_req: Request, res: Response) => {
  await saasService.cancelSubscription();
  res.json({ message: 'Subscription canceled' });
});

export const getUsage = asyncHandler(async (_req: Request, res: Response) => {
  res.json({});
});

export const getUsageSummary = asyncHandler(async (_req: Request, res: Response) => {
  res.json({});
});

const verifyCaptchaOnboard = async (token: string): Promise<boolean> => {
  const secret = process.env.RECAPTCHA_SECRET_KEY;
  if (!secret) return true;
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
    throw new BadRequestError('CAPTCHA verification failed');
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

export const getLimits = asyncHandler(async (_req: Request, res: Response) => {
  res.json({ doctors: { allowed: true, current: 0, limit: -1 }, patients: { allowed: true, current: 0, limit: -1 }, storage: { allowed: true, current: 0, limit: -1 } });
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
    throw new BadRequestError('No valid fields to update');
  }
  await saasService.updateTenantConfig(req.tenant_id, updates);
  res.json({ message: 'Configuration updated' });
});
