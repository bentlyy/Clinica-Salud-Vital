import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AppThemeProvider } from '@/shared/providers/ThemeProvider';
import { BillingSummaryCards } from '@/modules/billing/components/BillingSummaryCards';
import type { BillingStats } from '@/modules/billing/types/billing.types';

vi.mock('@/i18n/i18n', () => ({
  default: { language: 'es', on: vi.fn() },
}));

const stats: BillingStats = {
  total_invoices: 5,
  pending_invoices: 2,
  paid_invoices: 3,
  overdue_invoices: 1,
  total_revenue: 500,
  pending_amount: 200,
  paid_amount: 300,
  overdue_amount: 50,
  invoices_last_30_days: 4,
};

function renderCards(overrides: { stats?: BillingStats | undefined; isLoading?: boolean } = {}) {
  return render(
    <AppThemeProvider>
      <BillingSummaryCards stats={overrides.stats} isLoading={overrides.isLoading ?? false} />
    </AppThemeProvider>,
  );
}

describe('BillingSummaryCards', () => {
  it('renders all four summary cards with labels', () => {
    renderCards({ stats });
    expect(screen.getByText('Ingresos Totales')).toBeInTheDocument();
    expect(screen.getByText('Pendientes de Pago')).toBeInTheDocument();
    expect(screen.getByText('Facturas Vencidas')).toBeInTheDocument();
    expect(screen.getByText('Facturas Últimos 30 días')).toBeInTheDocument();
  });

  it('formats revenue values as currency', () => {
    renderCards({ stats });
    expect(screen.getByText('$500')).toBeInTheDocument();
    expect(screen.getByText('$200')).toBeInTheDocument();
    expect(screen.getByText('$50')).toBeInTheDocument();
  });

  it('formats the 30-day count as a plain number', () => {
    renderCards({ stats });
    expect(screen.getByText('4')).toBeInTheDocument();
  });

  it('shows placeholders while loading', () => {
    renderCards({ stats, isLoading: true });
    expect(screen.getAllByText('...')).toHaveLength(4);
  });

  it('falls back to zero values when stats are undefined', () => {
    renderCards({ stats: undefined });
    expect(screen.getAllByText('$0')).toHaveLength(3);
    expect(screen.getByText('0')).toBeInTheDocument();
  });
});
