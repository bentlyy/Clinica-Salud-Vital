import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AppThemeProvider } from '@/shared/providers/ThemeProvider';
import { NoShowsPanel } from '@/modules/analytics/components/NoShowsPanel';
import type { NoShowRecord } from '@/modules/analytics/types/analytics.types';

vi.mock('react-i18next', () => {
  const translations: Record<string, string> = {
    total_bookings: 'Reservas totales',
    no_shows: 'Inasistencias',
    no_show_rate: 'Tasa de inasistencia',
    no_shows_by_doctor: 'Inasistencias por doctor',
    total_bookings_chart: 'Reservas',
    prediction_no_shows: 'Predicción de inasistencias',
    prediction_description: 'Descripción',
    doctor: 'Doctor',
    risk: 'Riesgo',
    recommendation: 'Recomendación',
    extra_reminder: 'Recordatorio extra',
    normal: 'Normal',
  };
  return {
    useTranslation: () => ({
      t: (key: string) => translations[key] ?? key,
      i18n: { language: 'es' },
    }),
  };
});

const data: NoShowRecord[] = [
  { doctor: 'Dr. Ana', total: 10, noShows: 1 },
  { doctor: 'Dr. Luis', total: 10, noShows: 3 },
];

describe('NoShowsPanel', () => {
  it('computes and renders the aggregate stats', () => {
    render(
      <AppThemeProvider>
        <NoShowsPanel data={data} />
      </AppThemeProvider>,
    );
    expect(screen.getByText('20')).toBeInTheDocument(); // total bookings
    expect(screen.getByText('4')).toBeInTheDocument(); // no shows
    expect(screen.getByText('20.0%')).toBeInTheDocument(); // rate
    expect(screen.getByText('Inasistencias por doctor')).toBeInTheDocument();
  });

  it('flags high risk doctors and marks the rest as normal', () => {
    render(
      <AppThemeProvider>
        <NoShowsPanel data={data} />
      </AppThemeProvider>,
    );
    expect(screen.getByText('Dr. Ana')).toBeInTheDocument();
    expect(screen.getByText('Dr. Luis')).toBeInTheDocument();
    expect(screen.getByText('10.0%')).toBeInTheDocument(); // low risk
    expect(screen.getByText('30.0%')).toBeInTheDocument(); // high risk
    expect(screen.getByText('Recordatorio extra')).toBeInTheDocument();
    expect(screen.getAllByText('Normal').length).toBeGreaterThanOrEqual(1);
  });
});
