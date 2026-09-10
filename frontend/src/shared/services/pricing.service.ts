import { apiClient } from '@/shared/services/api-client';
import { FALLBACK_RATES } from '@/shared/utils/pricing';

interface ExchangeRatesResponse {
  data: {
    base: string;
    rates: Record<string, number>;
    updatedAt: string | null;
  };
}

/**
 * Obtiene las tasas de cambio desde el backend (GET /api/currencies/rates).
 * Si la petición falla, devuelve las tasas de respaldo para no bloquear la UI.
 */
export async function fetchExchangeRates(): Promise<Record<string, number>> {
  try {
    const { data } = await apiClient.get<ExchangeRatesResponse>('/currencies/rates');
    const rates = data?.data?.rates;
    if (rates && typeof rates.USD === 'number') return rates;
  } catch {
    // fallthrough → fallback offline
  }
  return { ...FALLBACK_RATES };
}