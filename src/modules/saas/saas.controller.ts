import { Request, Response } from 'express';
import { asyncHandler } from '../../middlewares/asyncHandler.middleware.js';
import * as saasService from './saas.service.js';
import * as onboardingService from './onboarding.service.js';
import { BadRequestError, NotFoundError } from '../../utils/errors.js';
import { E } from '../../utils/error-codes.js';
import { logger } from '../../utils/logger.js';
import { convertFromUsd } from '../../shared/currencies.js';
import {
  createCheckoutPreference,
  fetchPayment,
  isMercadoPagoConfigured,
} from '../../shared/mercadopago.service.js';

const PROFILE_KEYS = [
  'legal_name', 'tax_id', 'country', 'region', 'city', 'address', 'postal_code',
  'phone', 'website', 'license_number', 'legal_entity_type', 'legal_representative_name',
  'legal_representative_email', 'specialties', 'doctor_count', 'operating_hours', 'notes', 'admin_phone',
] as const;

const pickProfile = (body: Record<string, unknown>): onboardingService.OnboardingProfileInput => {
  const profile: onboardingService.OnboardingProfileInput = {};
  for (const key of PROFILE_KEYS) {
    if (body[key] !== undefined) {
      // @ts-expect-error dynamic key assignment from validated body
      profile[key] = body[key];
    }
  }
  return profile;
};

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
  const plan = await saasService.getPlanByCode(plan_code);

  // Mercado Pago configured: create a real Checkout Pro preference
  // (subscription is activated asynchronously via the webhook).
  if (isMercadoPagoConfigured()) {
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const currency = await saasService.getTenantCurrency(req.tenant_id);
    const preference = await createCheckoutPreference({
      tenantId: req.tenant_id,
      planCode: plan.code,
      planName: plan.name,
      currency,
      unitPrice: convertFromUsd(plan.price_monthly, currency),
      returnUrl: baseUrl,
    });
    res.status(201).json({
      url: preference.init_point,
      preferenceId: preference.id,
      mode: 'mercadopago',
    });
    return;
  }

  // MVP mode: create subscription directly (no Mercado Pago)
  const subscription = await saasService.createSubscription(req.tenant_id, plan_code);

  res.status(201).json({
    subscription,
    url: `/saas/success?plan=${plan_code}&tenant=${req.tenant_id}`,
    message: `Subscription created for plan '${plan_code}'`,
  });
});

/**
 * Mercado Pago webhook (Checkout Pro). The platform sends a notification with
 * the payment id; we never trust the notification itself — we resolve the
 * payment via the Mercado Pago API and reconcile only approved payments.
 */
export const mercadopagoWebhook = asyncHandler(async (req: Request, res: Response) => {
  const body: Record<string, unknown> = req.body ?? {};
  const type = body?.type ?? body?.topic ?? req.query?.type ?? req.query?.topic ?? 'payment';

  // Not configured → keep legacy stub behavior (acknowledge only).
  if (!isMercadoPagoConfigured()) {
    logger.info(`[Mercado Pago Webhook] Received notification (stub): type=${type}`);
    res.json({ received: true, mode: 'stub' });
    return;
  }

  try {
    if (type === 'payment') {
      const nestedData = body?.data as Record<string, unknown> | undefined;
      const paymentId = String(
        nestedData?.id ?? body?.['data.id'] ?? body?.data_id ?? body?.id ??
        req.query?.['data.id'] ?? req.query?.id ?? req.query?.data_id ?? ''
      ).trim();
      if (!paymentId) {
        res.status(400).json({ error: E.MERCADOPAGO_BAD_REQUEST });
        return;
      }
      const payment = await fetchPayment(paymentId);
      if (payment.status === 'approved') {
        await saasService.handleMercadoPagoPaymentApproved({
          id: payment.id,
          external_reference: payment.external_reference,
          metadata: payment.metadata,
        });
      } else {
        logger.info(`[Mercado Pago Webhook] payment ${paymentId} en estado '${payment.status}' — sin acción`);
      }
    } else {
      logger.info(`[Mercado Pago Webhook] topic '${type}' no requiere procesamiento`);
    }
  } catch (err) {
    const errCode = (err as Error & { code?: string }).code;
    if (errCode === 'PAYMENT_NOT_FOUND') {
      logger.info(`[Mercado Pago Webhook] notificación con payment inexistente — acknowledged (id=${(err as Error).message})`);
      return res.json({ received: true });
    }
    logger.error('[Mercado Pago Webhook] Notification handling failed', { error: (err as Error).message, type });
    res.status(500).json({ error: 'Webhook processing failed' });
    return;
  }

  return res.json({ received: true });
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
  if (secret === '6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe') {
    logger.warn('reCAPTCHA TEST key en uso — captcha aceptado siempre (modo prueba)');
    return true;
  }
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
  const profile = pickProfile(req.body);
  const result = await saasService.onboardTenant({
    tenantName: req.body.tenant_name,
    domain: req.body.domain,
    adminEmail: req.body.admin_email,
    adminPassword: req.body.admin_password,
    adminName: req.body.admin_name,
    locale: req.body.locale,
    timezone: req.body.timezone,
    currency: req.body.currency,
    countryCode: req.body.country_code,
    planCode: req.body.plan_code || 'free',
    ...(Object.keys(profile).length > 0 ? { profile } : {}),
    ...(Array.isArray(req.body.documents) && req.body.documents.length > 0 ? { documents: req.body.documents } : {}),
  });
  res.status(201).json(result);
});

// ─── Onboarding: perfil y documentos (clínica autenticada) ─

export const getMyOnboarding = asyncHandler(async (req: Request, res: Response) => {
  const onboarding = await onboardingService.getOnboardingForTenant(req.tenant_id);
  if (!onboarding) {
    res.json({ data: null });
    return;
  }
  res.json({ data: onboarding });
});

export const updateMyOnboarding = asyncHandler(async (req: Request, res: Response) => {
  const onboarding = await onboardingService.upsertOnboardingProfile(
    req.tenant_id,
    pickProfile(req.body),
  );
  res.json({ data: onboarding });
});

export const uploadOnboardingDocument = asyncHandler(async (req: Request, res: Response) => {
  const doc = await onboardingService.uploadOnboardingDocument(
    req.tenant_id,
    req.user!.id,
    req.body,
  );
  res.status(201).json({ data: doc });
});

export const listMyOnboardingDocuments = asyncHandler(async (req: Request, res: Response) => {
  const documents = await onboardingService.listOnboardingDocuments(req.tenant_id);
  res.json({ data: documents });
});

export const downloadOnboardingDocument = asyncHandler(async (req: Request, res: Response) => {
  const { record, filePath } = await onboardingService.getOnboardingDocument(
    Number(req.params.id),
    req.tenant_id,
  );
  res.download(filePath, record.original_name);
});

export const deleteOnboardingDocument = asyncHandler(async (req: Request, res: Response) => {
  await onboardingService.deleteOnboardingDocument(
    Number(req.params.id),
    req.tenant_id,
    req.user!.id,
    req.user!.role,
  );
  res.status(204).send();
});

// ─── Onboarding: aplicaciones (superadmin) ────────────────

export const listOnboardingApplications = asyncHandler(async (req: Request, res: Response) => {
  const result = await onboardingService.listOnboardingApplications({
    status: req.query.status as string | undefined,
    search: req.query.search as string | undefined,
    page: req.query.page ? Number(req.query.page) : undefined,
    limit: req.query.limit ? Number(req.query.limit) : undefined,
  });
  res.json(result);
});

export const getOnboardingApplication = asyncHandler(async (req: Request, res: Response) => {
  const application = await onboardingService.getOnboardingApplication(Number(req.params.id));
  if (!application) throw new NotFoundError(E.SAAS_ONBOARDING_NOT_FOUND);
  res.json({ data: application });
});

export const approveOnboardingApplication = asyncHandler(async (req: Request, res: Response) => {
  await onboardingService.approveOnboardingApplication(Number(req.params.id), req.user!.id);
  res.json({ message: 'Onboarding application approved' });
});

export const rejectOnboardingApplication = asyncHandler(async (req: Request, res: Response) => {
  await onboardingService.rejectOnboardingApplication(
    Number(req.params.id),
    req.user!.id,
    req.body.reason,
  );
  res.json({ message: 'Onboarding application rejected' });
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
  const allowed = ['name', 'locale', 'timezone', 'currency', 'country_code', 'config'];
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
