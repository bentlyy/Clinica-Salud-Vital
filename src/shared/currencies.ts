import { logger } from '../utils/logger.js';

export interface SupportedCountry {
  country: string;
  countryCode: string;
  currency: string;
  flag: string;
  decimals: number;
}

/**
 * Países/mercados soportados por el sistema, alineados con las monedas que
 * Mercado Pago procesa. `price_monthly`/`price_yearly` de los planes se
 * expresan ALWAYS en USD; cada mercado muestra/cobra la conversión local.
 */
export const SUPPORTED_COUNTRIES: SupportedCountry[] = [
  { country: 'Chile', countryCode: 'CL', currency: 'CLP', flag: '🇨🇱', decimals: 0 },
  { country: 'Argentina', countryCode: 'AR', currency: 'ARS', flag: '🇦🇷', decimals: 0 },
  { country: 'Brasil', countryCode: 'BR', currency: 'BRL', flag: '🇧🇷', decimals: 2 },
  { country: 'México', countryCode: 'MX', currency: 'MXN', flag: '🇲🇽', decimals: 2 },
  { country: 'Estados Unidos', countryCode: 'US', currency: 'USD', flag: '🇺🇸', decimals: 2 },
];

const FALLBACK_RATES: Record<string, number> = {
  USD: 1,
  CLP: 950,
  ARS: 1200,
  BRL: 5.4,
  MXN: 18.5,
};

let cachedRates: Record<string, number> = { ...FALLBACK_RATES };
let lastUpdatedAt: Date | null = null;

export const getRates = (): { base: 'USD'; rates: Record<string, number>; updatedAt: Date | null } => ({
  base: 'USD',
  rates: { ...cachedRates },
  updatedAt: lastUpdatedAt,
});

const pickSupported = (rates: Record<string, number>): Record<string, number> => {
  const out: Record<string, number> = { USD: 1 };
  for (const c of SUPPORTED_COUNTRIES) {
    const rate = rates[c.currency];
    if (typeof rate === 'number' && rate > 0) out[c.currency] = rate;
  }
  return out;
};

/**
 * Actualiza las tasas desde un proveedor gratuito (open.er-api.com, sin key).
 * Si falla, mantiene las tasas en caché/fallback. Se invoca al boot y vía cron.
 */
export const refreshRates = async (): Promise<void> => {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const res = await fetch('https://open.er-api.com/v6/latest/USD', { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) {
      logger.warn(`[Currencies] Provider responded ${res.status} — keeping cached rates`);
      return;
    }
    const data = (await res.json()) as { result?: string; rates?: Record<string, number> };
    if (data.result === 'success' && data.rates) {
      cachedRates = pickSupported(data.rates);
      lastUpdatedAt = new Date();
      logger.info('[Currencies] Exchange rates updated from live provider');
    } else {
      logger.warn('[Currencies] Invalid provider payload — keeping cached rates');
    }
  } catch (err) {
    logger.warn('[Currencies] Could not fetch live rates — using fallback cache', { error: (err as Error).message });
  }
};

export const getDecimals = (currency: string): number =>
  SUPPORTED_COUNTRIES.find((c) => c.currency === currency)?.decimals ?? 0;

export const getCurrencyForCountry = (countryCode: string): string =>
  SUPPORTED_COUNTRIES.find((c) => c.countryCode === (countryCode || '').toUpperCase())?.currency ?? 'CLP';

export const getCountryForCurrency = (currency: string): string =>
  SUPPORTED_COUNTRIES.find((c) => c.currency === (currency || '').toUpperCase())?.countryCode ?? 'CL';

/**
 * Convierte un monto USD a la moneda destino usando la tasa en caché (o una
 * provista explícitamente). Redondea según los decimales de la moneda.
 */
export const convertFromUsd = (
  usdAmount: number,
  currency: string,
  rates?: Record<string, number>,
): number => {
  const rate = (rates && rates[currency]) || cachedRates[currency] || 1;
  const raw = usdAmount * rate;
  const decimals = getDecimals(currency);
  const factor = 10 ** decimals;
  return Math.round(raw * factor) / factor;
};