import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AppThemeProvider } from '@/shared/providers/ThemeProvider';
import { DemandPanel } from '@/modules/analytics/components/DemandPanel';
import type { DemandRecord } from '@/modules/analytics/types/analytics.types';

vi.mock('react-i18next', () => {
  const translations: Record<string, string> = {
    bookings_30_days: 'Reservas 30 días',
    daily_average: 'Promedio diario',
    peak_day: 'Día pico',
    daily_demand: 'Demanda diaria',
    demand_forecast: 'Pronóstico de demanda',
    forecast_description: 'Descripción del pronóstico',
    bookings: 'reservas',
    high_demand: 'Alta demanda',
    normal: 'Normal',
    current: 'Actual',
  };
  return {
    useTranslation: () => ({
      t: (key: string) => translations[key] ?? key,
      i18n: { language: 'es' },
    }),
  };
});

const data: DemandRecord[] = [
  { date: '2026-01-01', bookings: 8, predicted: 10 },
  { date: '2026-01-02', bookings: 5 },
  { date: '2026-01-03', bookings: 7, predicted: 6 },
];

describe('DemandPanel', () => {
  it('computes the aggregate stats', () => {
    render(
      <AppThemeProvider>
        <DemandPanel data={data} />
      </AppThemeProvider>,
    );
    expect(screen.getByText('20')).toBeInTheDocument(); // total bookings
    expect(screen.getByText('7')).toBeInTheDocument(); // rounded daily average
    expect(screen.getByText('8')).toBeInTheDocument(); // peak day
  });

  it('classifies the forecast rows as high demand, normal or current', () => {
    render(
      <AppThemeProvider>
        <DemandPanel data={data} />
      </AppThemeProvider>,
    );
    expect(screen.getByText('Alta demanda')).toBeInTheDocument(); // predicted 10 > 8
    expect(screen.getByText('Normal')).toBeInTheDocument(); // predicted 6 < 7
    expect(screen.getByText('Actual')).toBeInTheDocument(); // no prediction
    expect(screen.getByText('Pronóstico de demanda')).toBeInTheDocument();
  });
});
