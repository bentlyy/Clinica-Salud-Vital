import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AppThemeProvider } from '@/shared/providers/ThemeProvider';
import { AlertCard } from '@/modules/super-admin/components/AlertCard';
import type { SaasAlert } from '@/modules/super-admin/types/super-admin.types';

const alert: SaasAlert = {
  tenant_id: 't1',
  tenant_name: 'Clínica Norte',
  type: 'possible_churn',
  severity: 'high',
  message: 'Sin reservas en 30 días',
};

function renderCard(a: SaasAlert = alert) {
  render(
    <MemoryRouter>
      <AppThemeProvider>
        <AlertCard alert={a} />
      </AppThemeProvider>
    </MemoryRouter>,
  );
}

describe('AlertCard', () => {
  it('renders the tenant name, message and severity chip', () => {
    renderCard();
    expect(screen.getByText('Clínica Norte')).toBeInTheDocument();
    expect(screen.getByText('Sin reservas en 30 días')).toBeInTheDocument();
    expect(screen.getByText('severity_high')).toBeInTheDocument();
  });

  it('renders a link to the tenant detail page', () => {
    renderCard();
    const link = screen.getByRole('link', { name: 'view_clinic' });
    expect(link).toHaveAttribute('href', '/tenants/t1');
  });

  it('falls back to the default severity label for unknown severities', () => {
    renderCard({ ...alert, severity: 'unknown' as SaasAlert['severity'] });
    expect(screen.getByText('severity_unknown')).toBeInTheDocument();
  });

  it('calls the alertIcon helper without crashing for a custom type', () => {
    renderCard({ ...alert, type: 'payment_overdue' });
    expect(screen.getByText('Clínica Norte')).toBeInTheDocument();
  });
});
