import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeAll } from 'vitest';
import { AppThemeProvider } from '@/shared/providers/ThemeProvider';
import { DashboardKpiCard } from '@/modules/super-admin/components/DashboardKpiCard';

// Recharts' ResponsiveContainer requires ResizeObserver, which jsdom does not
// implement. setup.ts already polyfills it, but under heavy parallel loads the
// global can be torn down by vitest's environment between files, so re-arm it
// here to keep this file self-contained.
beforeAll(() => {
  if (typeof globalThis.ResizeObserver === 'undefined') {
    class ResizeObserverMock {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    globalThis.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;
  }
});

function renderCard(props: Partial<React.ComponentProps<typeof DashboardKpiCard>> = {}) {
  render(
    <AppThemeProvider>
      <DashboardKpiCard
        label="Tenants"
        value="12"
        icon={<span data-testid="kpi-icon">i</span>}
        color="#2563eb"
        bgColor="#eff6ff"
        sparkData={[{ v: 1 }, { v: 3 }, { v: 2 }]}
        {...props}
      />
    </AppThemeProvider>,
  );
}

describe('DashboardKpiCard', () => {
  it('renders the label, value and icon', () => {
    renderCard();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('Tenants')).toBeInTheDocument();
    expect(screen.getByTestId('kpi-icon')).toBeInTheDocument();
  });

  it('shows a positive trend badge with the delta when trend.up is true', () => {
    renderCard({ trend: { value: 12, up: true } });
    expect(screen.getByText(/12%/)).toBeInTheDocument();
  });

  it('shows a negative trend badge with the absolute delta when trend.up is false', () => {
    renderCard({ trend: { value: 5, up: false } });
    expect(screen.getByText(/5%/)).toBeInTheDocument();
  });

  it('omits the trend badge when no trend is provided', () => {
    renderCard({ trend: null });
    expect(screen.queryByText(/12%/)).not.toBeInTheDocument();
    expect(screen.queryByText(/5%/)).not.toBeInTheDocument();
  });

  it('renders without the spark chart when sparkData has a single point', () => {
    renderCard({ sparkData: [{ v: 1 }] });
    expect(screen.getByText('12')).toBeInTheDocument();
  });
});
