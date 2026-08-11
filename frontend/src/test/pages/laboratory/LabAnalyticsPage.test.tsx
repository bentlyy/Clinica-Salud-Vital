import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppThemeProvider } from '@/shared/providers/ThemeProvider';
import LabAnalyticsPage from '@/modules/laboratory/pages/LabAnalyticsPage';

const hooks = vi.hoisted(() => ({ useLabAnalytics: vi.fn() }));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: unknown) => (typeof opts === 'string' ? opts : key),
    i18n: { changeLanguage: vi.fn() },
  }),
  initReactI18next: { type: '3rdParty', init: () => undefined },
}));
vi.mock('@/modules/laboratory/hooks/useLab', () => hooks);

const analytics = {
  daily: [
    { date: '2026-08-10', count: 5 },
    { date: '2026-08-11', count: 7 },
  ],
  weekly: [],
  monthly: [],
  by_area: [{ area_name: 'Hematologia', count: 12 }],
  by_doctor: [{ doctor_name: 'Dr. Perez', count: 6 }],
  by_priority: [{ priority: 'urgent', count: 2 }],
  top_tests: [{ test_name: 'Hemograma', count: 10 }],
  bottom_tests: [{ test_name: 'TSH', count: 1 }],
  avg_processing_time: 45.3,
  repeat_rate: 2.5,
  error_rate: 1.2,
  sla_compliance: 95.5,
  total_revenue: 250000,
  total: 40,
};

function renderPage() {
  return render(
    <AppThemeProvider>
      <LabAnalyticsPage />
    </AppThemeProvider>,
  );
}

describe('LabAnalyticsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hooks.useLabAnalytics.mockReturnValue({ data: null, isLoading: false, error: null, refetch: vi.fn() });
  });

  it('renders the loading state while fetching', () => {
    hooks.useLabAnalytics.mockReturnValue({ data: undefined, isLoading: true, error: null, refetch: vi.fn() });
    renderPage();
    expect(screen.getByText('loading')).toBeInTheDocument();
  });

  it('renders the error state when the query fails', () => {
    hooks.useLabAnalytics.mockReturnValue({ data: undefined, isLoading: false, error: new Error('analytics down'), refetch: vi.fn() });
    renderPage();
    expect(screen.getByText('analytics down')).toBeInTheDocument();
  });

  it('renders the empty state when there is no data', () => {
    renderPage();
    expect(screen.getByText('no_data_title')).toBeInTheDocument();
  });

  it('renders summary metrics and analytics tables with data', () => {
    hooks.useLabAnalytics.mockReturnValue({ data: analytics, isLoading: false, error: null, refetch: vi.fn() });
    renderPage();
    // Summary metric values (formatted)
    expect(screen.getByText('45.3 min')).toBeInTheDocument();
    expect(screen.getByText('95.5%')).toBeInTheDocument();
    // Tables (top tests render as "1. Name"; there is no bottom-tests section)
    expect(screen.getByText('Dr. Perez')).toBeInTheDocument();
    expect(screen.getByText('Hematologia')).toBeInTheDocument();
    expect(screen.getByText('1. Hemograma')).toBeInTheDocument();
  });

  it('submits the date range and re-queries analytics', async () => {
    hooks.useLabAnalytics.mockReturnValue({ data: analytics, isLoading: false, error: null, refetch: vi.fn() });
    renderPage();

    const fromInput = screen.getByLabelText('date_from');
    const toInput = screen.getByLabelText('date_to');
    fireEvent.change(fromInput, { target: { value: '2026-08-01' } });
    fireEvent.change(toInput, { target: { value: '2026-08-31' } });

    fireEvent.submit(fromInput.closest('form') as HTMLFormElement);

    // RHF handleSubmit is async — poll until the re-query happens
    await waitFor(() => {
      expect(hooks.useLabAnalytics).toHaveBeenLastCalledWith({
        dateFrom: '2026-08-01',
        dateTo: '2026-08-31',
      });
    });
  });
});
