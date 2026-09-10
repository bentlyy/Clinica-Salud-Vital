import { logger } from '../utils/logger.js';

export interface MercadoPagoPreferenceParams {
  tenantId: string;
  planCode: string;
  planName: string;
  /** Precio mensual en CLP (entero, sin decimales, como espera Mercado Pago). */
  priceCLP: number;
  returnUrl: string;
}

export interface MercadoPagoPreference {
  id: string;
  init_point: string;
  sandbox_init_point: string;
}

export interface MercadoPagoPayment {
  id: string;
  status: string;
  status_detail: string;
  external_reference: string | null;
  metadata?: { plan_code?: string };
  transaction_amount: number;
}

const API_BASE = 'https://api.mercadopago.com';

export const isMercadoPagoConfigured = (): boolean =>
  Boolean(process.env.MERCADOPAGO_ACCESS_TOKEN);

export const getAccessToken = (): string => process.env.MERCADOPAGO_ACCESS_TOKEN || '';

const createPreference = async (params: MercadoPagoPreferenceParams): Promise<MercadoPagoPreference> => {
  const base = params.returnUrl.replace(/\/$/, '');
  const body = {
    items: [
      {
        id: `plan_${params.planCode}`,
        title: `Suscripción Vitaria ${params.planName}`,
        description: `Plan ${params.planName} — 1 mes`,
        quantity: 1,
        currency_id: 'CLP',
        unit_price: params.priceCLP,
      },
    ],
    metadata: { plan_code: params.planCode, tenant_id: params.tenantId },
    external_reference: params.tenantId,
    back_urls: {
      success: `${base}/saas/success`,
      pending: `${base}/saas/success`,
      failure: `${base}/saas/checkout?canceled=1`,
    },
    auto_return: 'approved',
    notification_url:
      process.env.MERCADOPAGO_NOTIFICATION_URL || `${base}/api/saas/webhook/mercadopago`,
    statement_descriptor: 'Vitaria',
  };

  const raw = await fetch(`${API_BASE}/checkout/preferences`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getAccessToken()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(12000),
  });

  const data = await raw.json() as MercadoPagoPreference & { error?: { message?: string } };
  if (!raw.ok || !data.id || !data.init_point) {
    throw new Error(data.error?.message || 'Mercado Pago preference request failed');
  }
  logger.info(`[Mercado Pago] Preference creada ${data.id} para tenant ${params.tenantId} plan=${params.planCode}`);
  return data;
};

/**
 * Verifies a payment against the Mercado Pago API. This is the recommended way
 * to authenticate webhook notifications: we never trust the raw payload, we
 * confirm the payment exists and read its real status.
 */
export const fetchPayment = async (paymentId: string): Promise<MercadoPagoPayment> => {
  const raw = await fetch(`${API_BASE}/v1/payments/${encodeURIComponent(paymentId)}`, {
    headers: { Authorization: `Bearer ${getAccessToken()}` },
    signal: AbortSignal.timeout(12000),
  });
  const data = await raw.json() as MercadoPagoPayment & { error?: { message?: string } };
  if (!raw.ok || !data.id) {
    const message = data.error?.message || 'Mercado Pago payment lookup failed';
    if (raw.status === 404) {
      const err = new Error(message) as Error & { code?: string };
      err.code = 'PAYMENT_NOT_FOUND';
      throw err;
    }
    throw new Error(message);
  }
  return data;
};

/**
 * Modo simulado sin credenciales: devuelve la URL del frontend como si el
 * pago hubiera iniciado, manteniendo el flujo MVP (el pago se confirma
 * directamente en BD al crear la suscripción).
 */
export const createCheckoutPreference = async (
  params: MercadoPagoPreferenceParams
): Promise<{ id: string; init_point: string; sandbox_init_point: string }> => {
  if (!isMercadoPagoConfigured()) {
    logger.info('[Mercado Pago] stub mode: preference simulada (MERCADOPAGO_ACCESS_TOKEN no configurado)');
    return {
      id: `pref_simulated_${params.planCode}`,
      init_point: `${params.returnUrl.replace(/\/$/, '')}/saas/success?plan=${params.planCode}&tenant=${params.tenantId}`,
      sandbox_init_point: '',
    };
  }
  return createPreference(params);
};