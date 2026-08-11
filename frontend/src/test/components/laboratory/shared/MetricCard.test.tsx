import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AppThemeProvider } from '@/shared/providers/ThemeProvider';
import { MetricCard, MetricCardSkeleton } from '@/modules/laboratory/components/shared/MetricCard';

function renderCard(props: React.ComponentProps<typeof MetricCard>) {
  return render(
    <AppThemeProvider>
      <MetricCard {...props} />
    </AppThemeProvider>,
  );
}

describe('MetricCard', () => {
  it('renders title and value', () => {
    renderCard({ title: 'Pendientes', value: 12 });
    expect(screen.getByText('Pendientes')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
  });

  it('renders the subtitle when provided', () => {
    renderCard({ title: 'Urgentes', value: 3, subtitle: 'Requieren atención' });
    expect(screen.getByText('Requieren atención')).toBeInTheDocument();
  });

  it('renders an upward trend indicator', () => {
    renderCard({ title: 'Procesados', value: 5, trend: { value: 12.5, isPositive: true } });
    expect(screen.getByText('↑ 12.5%')).toBeInTheDocument();
  });

  it('renders a downward trend indicator', () => {
    renderCard({ title: 'Errores', value: 2, trend: { value: 8, isPositive: false } });
    expect(screen.getByText('↓ 8%')).toBeInTheDocument();
  });

  it('triggers onClick when provided', () => {
    const onClick = vi.fn();
    renderCard({ title: 'SLA', value: 98, onClick });
    fireEvent.click(screen.getByText('SLA'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('does not render a trend when absent', () => {
    renderCard({ title: 'Simple', value: 1 });
    expect(screen.queryByText(/%$/)).not.toBeInTheDocument();
  });
});

describe('MetricCardSkeleton', () => {
  it('renders skeleton placeholders', () => {
    render(
      <AppThemeProvider>
        <MetricCardSkeleton />
      </AppThemeProvider>,
    );
    expect(document.querySelector('.MuiSkeleton-root')).toBeInTheDocument();
  });
});
