import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AppThemeProvider } from '@/shared/providers/ThemeProvider';
import { StatusPieChart } from '@/modules/analytics/components/StatusPieChart';
import type { BookingsByStatus } from '@/modules/analytics/types/analytics.types';

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
// nothing. Stub Pie to receive and render the mapped chart data.
vi.mock('recharts', () => {
  const Box = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>;
  const Pie = ({ data }: { data?: { name: string; value: number }[] }) => (
    <div data-testid="pie">
      {data?.map((d) => (
        <span key={d.name}>
          {d.name}:{d.value}
        </span>
      ))}
    </div>
  );
  return {
    ResponsiveContainer: Box,
    PieChart: Box,
    Pie,
    Cell: () => null,
    Tooltip: () => null,
    Legend: () => null,
  };
});

vi.mock('react-i18next', () => {
  const translations: Record<string, string> = {
    bookings_by_status: 'Reservas por Estado',
    loading_data: 'Cargando datos...',
    noData: 'Sin datos disponibles',
    status_confirmed: 'Confirmadas',
    status_completed: 'Completadas',
    status_cancelled: 'Canceladas',
    status_pending: 'Pendientes',
    status_no_show: 'No asistió',
  };
  return {
    useTranslation: () => ({
      t: (key: string) => translations[key] ?? key,
      i18n: { language: 'es' },
    }),
  };
});

const data: BookingsByStatus[] = [
  { status: 'confirmed', count: 8 },
  { status: 'cancelled', count: 2 },
  { status: 'unknown_status', count: 1 },
];

function renderChart(overrides: Partial<React.ComponentProps<typeof StatusPieChart>> = {}) {
  return render(
    <AppThemeProvider>
      <StatusPieChart data={[]} isLoading={false} {...overrides} />
    </AppThemeProvider>,
  );
}

describe('StatusPieChart', () => {
  it('shows the loading message while loading', () => {
    renderChart({ isLoading: true });
    expect(screen.getByText('Cargando datos...')).toBeInTheDocument();
  });

  it('shows the empty state when there is no data', () => {
    renderChart({ data: [] });
    expect(screen.getByText('Sin datos disponibles')).toBeInTheDocument();
  });

  it('maps known statuses to translated labels and falls back to the raw status', () => {
    renderChart({ data });
    expect(screen.getByText('Reservas por Estado')).toBeInTheDocument();
    expect(screen.getByText('Confirmadas:8')).toBeInTheDocument();
    expect(screen.getByText('Canceladas:2')).toBeInTheDocument();
    expect(screen.getByText('unknown_status:1')).toBeInTheDocument();
  });
});
