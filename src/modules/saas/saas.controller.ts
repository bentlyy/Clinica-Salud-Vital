import { Request, Response } from 'express';
import { asyncHandler } from '../../middlewares/asyncHandler.middleware.js';
import * as saasService from './saas.service.js';
import { getStripe, getWebhookSecret, isStripeConfigured, checkIdempotency } from '../../shared/stripe.service.js';
import { logger } from '../../utils/logger.js';
import { BadRequestError } from '../../utils/errors.js';

export const getPlans = asyncHandler(async (_req: Request, res: Response) => {
  const plans = await saasService.getPlans();
  res.json({ data: plans });
});

export const getMySubscription = asyncHandler(async (req: Request, res: Response) => {
  const sub = await saasService.getTenantSubscription(req.tenant_id);
  const plan = sub ? await saasService.getPlanById(sub.plan_id) : null;
  res.json({ subscription: sub || null, plan });
});

export const createCheckout = asyncHandler(async (req: Request, res: Response) => {
  const { plan_code, success_url, cancel_url } = req.body;

  const stripe = await getStripe();
  const plan = await saasService.getPlanByCode(plan_code);

  if (!isStripeConfigured()) {
    res.json({
      url: `/saas/success?plan=${plan_code}&tenant=${req.tenant_id}`,
      session_id: 'simulated',
    });
    return;
  }

  try {
    const checkout = (stripe as Record<string, unknown>).checkout as Record<string, unknown>;
    const sessions = checkout.sessions as Record<string, unknown>;
    const session = await (sessions.create as Function)({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: { name: plan.name, description: plan.description || '' },
            unit_amount: Math.round(plan.price_monthly * 100),
            recurring: { interval: 'month' },
          },
          quantity: 1,
        },
      ],
      client_reference_id: req.tenant_id,
      customer_email: req.user?.email,
      success_url: success_url || `${req.headers.origin}/saas/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancel_url || `${req.headers.origin}/saas/plans`,
      metadata: { tenant_id: req.tenant_id },
    });

    res.json({ url: (session as Record<string, unknown>).url, session_id: (session as Record<string, unknown>).id });
  } catch (err) {
    logger.error('Stripe checkout error:', err);
    res.status(502).json({ error: 'Payment gateway error. Please try again.' });
  }
});

export const stripeWebhook = asyncHandler(async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string;
  const idempotencyKey = (req.headers['idempotency-key'] || req.headers['Idempotency-Key'] || req.headers['Stripe-Idempotency-Key']) as string | undefined;

  if (idempotencyKey && !checkIdempotency(idempotencyKey)) {
    logger.info('Stripe webhook already processed (idempotency)', { key: idempotencyKey });
    res.json({ received: true, deduplicated: true });
    return;
  }

  try {
    const stripe = await getStripe();
    const whSecret = getWebhookSecret();
    const webhooks = (stripe as Record<string, unknown>).webhooks as Record<string, unknown>;
    const event = (webhooks.constructEvent as Function)(req.body, sig, whSecret);
    const eventId = event.id || idempotencyKey;

    if (eventId && !checkIdempotency(eventId)) {
      logger.info('Stripe webhook event already processed', { eventId });
      res.json({ received: true, deduplicated: true });
      return;
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as { client_reference_id?: string; metadata?: Record<string, string>; subscription?: string; customer?: string };
        const tenantId = session.client_reference_id || session.metadata?.tenant_id || 'default';
        const subId = session.subscription as string;

        const existingSub = await saasService.getTenantSubscription(tenantId);
        if (existingSub) {
          const plan = await saasService.getPlanById(existingSub.plan_id);
          await saasService.changePlan(tenantId, plan.code, subId);
        }
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object as { metadata?: Record<string, string>; id: string };
        const tenantId = sub.metadata?.tenant_id || 'default';
        await saasService.cancelSubscription(tenantId);
        break;
      }
    }

    res.json({ received: true });
  } catch (err) {
    logger.error('Stripe webhook error:', err);
    throw new BadRequestError('Webhook signature verification failed');
  }
});

export const changePlan = asyncHandler(async (req: Request, res: Response) => {
  const { plan_code } = req.body;
  const result = await saasService.changePlan(req.tenant_id, plan_code);
  res.json(result);
});

export const cancelSubscription = asyncHandler(async (req: Request, res: Response) => {
  await saasService.cancelSubscription(req.tenant_id);
  res.json({ message: 'Subscription canceled' });
});

export const getUsage = asyncHandler(async (req: Request, res: Response) => {
  const days = parseInt(req.query.days as string, 10) || 30;
  const metrics = (req.query.metrics as string || 'api_calls').split(',');
  const usage: Record<string, unknown> = {};

  for (const metric of metrics) {
    usage[metric] = await saasService.getTenantUsage(req.tenant_id, metric.trim(), days);
  }

  res.json(usage);
});

export const getUsageSummary = asyncHandler(async (req: Request, res: Response) => {
  const summary = await saasService.getUsageSummary(req.tenant_id);
  res.json(summary);
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
  } catch (err) {
    logger.error('reCAPTCHA verification failed during onboard', { error: (err as Error).message });
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

export const getLimits = asyncHandler(async (req: Request, res: Response) => {
  const doctors = await saasService.checkLimits(req.tenant_id, 'doctors');
  const patients = await saasService.checkLimits(req.tenant_id, 'patients');
  const storage = await saasService.checkLimits(req.tenant_id, 'storage');
  res.json({ doctors, patients, storage });
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
