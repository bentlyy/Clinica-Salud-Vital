import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AppThemeProvider } from '@/shared/providers/ThemeProvider';
import { BookingsByMonthChart } from '@/modules/analytics/components/BookingsByMonthChart';
import type { BookingsByMonth } from '@/modules/analytics/types/analytics.types';

vi.mock('framer-motion', () => {
  const PassThrough = (props: { children?: React.ReactNode }) => props.children ?? null;
  return {
    motion: new Proxy(PassThrough, {
      apply: () => PassThrough,
      get: () => PassThrough,
    }),
  };
});

// ResponsiveContainer cannot measure sizes in jsdom, so recharts renders
// nothing. Stub it with prop-aware components to verify the wiring.
vi.mock('recharts', () => {
  const Box = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>;
  const Bar = ({ name, dataKey }: { name?: string; dataKey?: string }) => (
    <span data-key={dataKey}>{name}</span>
  );
  return {
    ResponsiveContainer: Box,
    BarChart: Box,
    Bar,
    XAxis: () => null,
    YAxis: () => null,
    CartesianGrid: () => null,
    Tooltip: () => null,
    Legend: () => null,
  };
});

vi.mock('react-i18next', () => {
  const translations: Record<string, string> = {
    bookings_by_month: 'Reservas por Mes',
    loading_data: 'Cargando datos...',
    noData: 'Sin datos disponibles',
    status_confirmed: 'Confirmadas',
    status_cancelled: 'Canceladas',
    bookings: 'Reservas',
  };
  return {
    useTranslation: () => ({
      t: (key: string) => translations[key] ?? key,
      i18n: { language: 'es' },
    }),
  };
});

const data: BookingsByMonth[] = [
  { month: '2026-01', total: 10, confirmed: 8, cancelled: 1 },
  { month: '2026-02', total: 12, confirmed: 10, cancelled: 2 },
];

function renderChart(overrides: Partial<React.ComponentProps<typeof BookingsByMonthChart>> = {}) {
  return render(
    <AppThemeProvider>
      <BookingsByMonthChart data={[]} isLoading={false} {...overrides} />
    </AppThemeProvider>,
  );
}

describe('BookingsByMonthChart', () => {
  it('shows the loading message while loading', () => {
    renderChart({ isLoading: true });
    expect(screen.getByText('Cargando datos...')).toBeInTheDocument();
  });

  it('shows the empty state when there is no data', () => {
    renderChart({ data: [] });
    expect(screen.getByText('Sin datos disponibles')).toBeInTheDocument();
  });

  it('renders the title and the chart series with translated labels', () => {
    const { container } = renderChart({ data });
    expect(screen.getByText('Reservas por Mes')).toBeInTheDocument();
    expect(container.querySelectorAll('span[data-key]').length).toBe(3); // confirmed, cancelled, total
    expect(screen.getByText('Confirmadas')).toBeInTheDocument();
    expect(screen.getByText('Canceladas')).toBeInTheDocument();
  });
});
