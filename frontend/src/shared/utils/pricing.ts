/**
 * Utilidades de precios/moneda del frontend.
 *
 * Los precios de los planes se expresan SIEMPRE en USD (fuente de verdad en el
 * backend). Cada país/mercado muestra y cobra la conversión local mediante las
 * tasas expuestas por GET /api/currencies/rates (con fallback offline).
 */

export interface SupportedCountry {
  /** Clave de i18n del nombre del país. */
  countryKey: string;
  countryCode: string;
  currency: string;
  flag: string;
  decimals: number;
}

export const SUPPORTED_COUNTRIES: SupportedCountry[] = [
  { countryKey: 'pricingCountryCL', countryCode: 'CL', currency: 'CLP', flag: '🇨🇱', decimals: 0 },
  { countryKey: 'pricingCountryAR', countryCode: 'AR', currency: 'ARS', flag: '🇦🇷', decimals: 0 },
  { countryKey: 'pricingCountryBR', countryCode: 'BR', currency: 'BRL', flag: '🇧🇷', decimals: 2 },
  { countryKey: 'pricingCountryMX', countryCode: 'MX', currency: 'MXN', flag: '🇲🇽', decimals: 2 },
  { countryKey: 'pricingCountryUS', countryCode: 'US', currency: 'USD', flag: '🇺🇸', decimals: 2 },
];

export const FALLBACK_RATES: Record<string, number> = {
  USD: 1,
  CLP: 950,
  ARS: 1200,
  BRL: 5.4,
  MXN: 18.5,
};

export const DEFAULT_COUNTRY_CODE = 'CL';

export const getDecimals = (currency: string): number =>
  SUPPORTED_COUNTRIES.find((c) => c.currency === currency.toUpperCase())?.decimals ?? 0;

export const getCurrencyForCountry = (countryCode: string): string =>
  SUPPORTED_COUNTRIES.find((c) => c.countryCode === countryCode.toUpperCase())?.currency ?? 'CLP';

export const getCountryForCurrency = (currency: string): string =>
  SUPPORTED_COUNTRIES.find((c) => c.currency === currency.toUpperCase())?.countryCode ?? DEFAULT_COUNTRY_CODE;

export const getCountryByCode = (countryCode: string): SupportedCountry =>
  SUPPORTED_COUNTRIES.find((c) => c.countryCode === countryCode.toUpperCase()) ?? SUPPORTED_COUNTRIES[0]!;

export const getCountryByCurrency = (currency: string): SupportedCountry =>
  SUPPORTED_COUNTRIES.find((c) => c.currency === currency.toUpperCase()) ?? SUPPORTED_COUNTRIES[0]!;

/**
 * Convierte un monto USD a la moneda destino. Usa las tasas provistas o el
 * fallback offline si no están disponibles.
 */
export const convertUsd = (usdAmount: number, currency: string, rates?: Record<string, number> | null): number => {
  const rate = (rates && rates[currency.toUpperCase()]) || FALLBACK_RATES[currency.toUpperCase()] || 1;
  const raw = usdAmount * rate;
  const decimals = getDecimals(currency);
  const factor = 10 ** decimals;
  return Math.round(raw * factor) / factor;
};

/**
 * Formatea un monto en la moneda destino respetando la cantidad de decimales
 * del mercado (CLP/ARS sin decimales, BRL/MXN/USD con 2).
 */
export const formatPricingAmount = (value: number, currency: string): string => {
  const decimals = getDecimals(currency);
  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
};

export const CURRENCY_SYMBOLS: Record<string, string> = {
  CLP: '$',
  ARS: '$',
  BRL: 'R$',
  MXN: '$',
  USD: '$',
};

export const getCurrencySymbol = (currency: string): string =>
  CURRENCY_SYMBOLS[currency.toUpperCase()] || '$';