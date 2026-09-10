import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/shared/providers/AuthProvider';
import {
  FALLBACK_RATES,
  DEFAULT_COUNTRY_CODE,
  convertUsd,
  getCountryByCode,
  getCountryByCurrency,
  getCurrencyForCountry,
  getCurrencySymbol,
  type SupportedCountry,
} from '@/shared/utils/pricing';
import { fetchExchangeRates } from '@/shared/services/pricing.service';

const STORAGE_KEY = 'vitaria_country';

// Caché a nivel de módulo: evita múltiples fetchs desde distintos componentes.
let sharedRates: Record<string, number> | null = null;
let ratesPromise: Promise<Record<string, number>> | null = null;

function loadRates(): Promise<Record<string, number>> {
  if (!ratesPromise) {
    ratesPromise = fetchExchangeRates().then((rates) => {
      sharedRates = rates;
      return rates;
    });
  }
  return ratesPromise;
}

export interface PricingContext {
  /** País efectivo para display (tenant autenticado o seleccionado en Landing). */
  country: SupportedCountry;
  /** Moneda efectiva de display: la del tenant autenticado, si existe. */
  currency: string;
  countryCode: string;
  /** El usuario autenticado tiene moneda de tenant (backend la resuelve). */
  fromTenant: boolean;
}

export function useSelectedCountry(): [string, (code: string) => void] {
  const [countryCode, setCountryCode] = useState<string>(() => {
    if (typeof window === 'undefined') return DEFAULT_COUNTRY_CODE;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored || DEFAULT_COUNTRY_CODE;
  });

  const setSelectedCountry = useCallback((code: string) => {
    const next = (code || DEFAULT_COUNTRY_CODE).toUpperCase();
    setCountryCode(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // localStorage no disponible — solo estado en memoria.
    }
  }, []);

  return [countryCode, setSelectedCountry];
}

/**
 * Moneda/país efectivos para precios:
 * - Usuario autenticado con tenant → moneda del tenant (via login/refresh).
 * - Usuario anónimo (Landing) → país seleccionado por el visitante.
 */
export function usePricingContext(): PricingContext {
  const { user } = useAuth();
  const [guestCountry, setGuestCountry] = useSelectedCountry();

  const fromTenant = Boolean(user?.currency);
  const currency = user?.currency ?? getCurrencyForCountry(guestCountry);
  const countryCode = user?.country_code ?? getCountryByCurrency(currency).countryCode;

  useEffect(() => {
    if (!fromTenant && countryCode !== guestCountry) {
      setGuestCountry(countryCode);
    }
  }, [countryCode, fromTenant, guestCountry, setGuestCountry]);

  const country = fromTenant ? getCountryByCurrency(currency) : getCountryByCode(guestCountry);

  return useMemo(
    () => ({ country, currency, countryCode, fromTenant }),
    [country, currency, countryCode, fromTenant],
  );
}

export function useExchangeRates(): { rates: Record<string, number>; loading: boolean } {
  const [rates, setRates] = useState<Record<string, number>>(() => sharedRates ?? FALLBACK_RATES);
  const [loading, setLoading] = useState<boolean>(!sharedRates);

  useEffect(() => {
    let mounted = true;
    loadRates().then((loaded) => {
      if (mounted) {
        setRates(loaded);
        setLoading(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  return useMemo(() => ({ rates, loading }), [rates, loading]);
}

/**
 * Precio de un plan (USD, fuente de verdad) convertido a la moneda efectiva.
 */
export function useConvertedPrice(usdAmount: number): {
  amount: number;
  currency: string;
  symbol: string;
  countryCode: string;
  fromTenant: boolean;
} {
  const { country, currency, countryCode, fromTenant } = usePricingContext();
  const { rates } = useExchangeRates();

  return useMemo(
    () => ({
      amount: convertUsd(usdAmount, currency, rates),
      currency,
      symbol: getCurrencySymbol(currency),
      countryCode,
      fromTenant,
    }),
    [usdAmount, currency, rates, countryCode, fromTenant, country],
  );
}