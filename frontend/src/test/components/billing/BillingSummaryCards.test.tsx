import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AppThemeProvider } from '@/shared/providers/ThemeProvider';
import { BillingSummaryCards } from '@/modules/billing/components/BillingSummaryCards';
import type { BillingStats } from '@/modules/billing/types/billing.types';

vi.mock('@/i18n/i18n', () => ({
  default: { language: 'es', on: vi.fn() },
}));

const stats: BillingStats = {
  total_outstanding: 200,
  total_paid: 300,
  overdue_invoices: 1,
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
    expect(screen.getByText('Total Pagado')).toBeInTheDocument();
  });

  it('formats revenue values as currency', () => {
    renderCards({ stats });
    expect(screen.getAllByText('$300')).toHaveLength(2);
    expect(screen.getByText('$200')).toBeInTheDocument();
  });

  it('formats the overdue count as a plain number', () => {
    renderCards({ stats });
    expect(screen.getByText('1')).toBeInTheDocument();
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
