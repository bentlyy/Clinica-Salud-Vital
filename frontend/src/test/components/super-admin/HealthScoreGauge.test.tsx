import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { AppThemeProvider } from '@/shared/providers/ThemeProvider';
import { HealthScoreGauge } from '@/modules/super-admin/components/HealthScoreGauge';
import type { HealthScore } from '@/modules/super-admin/types/super-admin.types';

const tenant: HealthScore = {
  id: 't1',
  name: 'Clínica Norte',
  active: true,
  health_score: 72,
  score_activity: 15,
  score_trend: 12,
  score_patients: 18,
  score_cancellation: 10,
  score_modules: 17,
  last_booking: '2026-07-01T00:00:00Z',
  bookings_30d: 20,
  bookings_prev_30d: 15,
};

describe('HealthScoreGauge', () => {
  it('renders the tenant name, score and /100 scale', () => {
    render(
      <AppThemeProvider>
        <HealthScoreGauge tenant={tenant} />
      </AppThemeProvider>,
    );
    expect(screen.getByText('Clínica Norte')).toBeInTheDocument();
    expect(screen.getByText('72')).toBeInTheDocument();
    expect(screen.getByText('/100')).toBeInTheDocument();
  });

  it('renders the five dimension labels with their values', () => {
    render(
      <AppThemeProvider>
        <HealthScoreGauge tenant={tenant} />
      </AppThemeProvider>,
    );
    expect(screen.getByText('dim_activity')).toBeInTheDocument();
    expect(screen.getByText('dim_trend')).toBeInTheDocument();
    expect(screen.getByText('dim_patients')).toBeInTheDocument();
    expect(screen.getByText('dim_cancellation')).toBeInTheDocument();
    expect(screen.getByText('dim_modules')).toBeInTheDocument();
    expect(screen.getByText('15')).toBeInTheDocument();
    expect(screen.getByText('18')).toBeInTheDocument();
  });

  it('renders a zero score without crashing', () => {
    render(
      <AppThemeProvider>
        <HealthScoreGauge tenant={{ ...tenant, health_score: 0, score_activity: 0 }} />
      </AppThemeProvider>,
    );
    expect(screen.getAllByText('0').length).toBeGreaterThanOrEqual(1);
  });
});
