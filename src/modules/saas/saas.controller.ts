import { Request, Response } from 'express';
import { asyncHandler } from '../../middlewares/asyncHandler.middleware.js';
import * as saasService from './saas.service.js';
import { getStripe, getWebhookSecret, isStripeConfigured } from '../../shared/stripe.service.js';
import { logger } from '../../utils/logger.js';

export const getPlans = asyncHandler(async (_req: Request, res: Response) => {
  const plans = await saasService.getPlans();
  res.json({ data: plans });
});

export const getMySubscription = asyncHandler(async (req: Request, res: Response) => {
  const sub = await saasService.getTenantSubscription(req.tenant_id);
  const plan = sub ? await saasService.getPlanById(sub.plan_id) : null;
  res.json({ subscription: sub, plan });
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
    res.json({
      url: `/saas/success?plan=${plan_code}&tenant=${req.tenant_id}`,
      session_id: 'simulated',
    });
  }
});

export const stripeWebhook = asyncHandler(async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string;
  try {
    const stripe = await getStripe();
    const whSecret = getWebhookSecret();
    const webhooks = (stripe as Record<string, unknown>).webhooks as Record<string, unknown>;
    const event = (webhooks.constructEvent as Function)(req.body, sig, whSecret);

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
    res.status(400).json({ error: 'Webhook signature verification failed' });
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

export const onboardTenant = asyncHandler(async (req: Request, res: Response) => {
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
