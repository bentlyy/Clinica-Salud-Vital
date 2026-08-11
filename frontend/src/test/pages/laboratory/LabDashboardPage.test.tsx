import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AppThemeProvider } from '@/shared/providers/ThemeProvider';
import LabDashboardPage from '@/modules/laboratory/pages/LabDashboardPage';

const hooks = vi.hoisted(() => ({
  useLabDashboard: vi.fn(),
  useLabRequests: vi.fn(),
  useLabNotifications: vi.fn(),
  useLabSSE: vi.fn(),
  useLabFilters: vi.fn(),
  useLabAreas: vi.fn(),
  useUpdateLabRequestStatus: vi.fn(),
}));

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), loading: vi.fn(), dismiss: vi.fn() }));

const labServiceMock = vi.hoisted(() => ({
  subscribeToLabSSE: vi.fn(() => ({ close: vi.fn(), onerror: null })),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: unknown) => (typeof opts === 'string' ? opts : key),
    i18n: { changeLanguage: vi.fn() },
  }),
  initReactI18next: { type: '3rdParty', init: () => undefined },
}));
vi.mock('@/modules/laboratory/hooks/useLab', () => hooks);
vi.mock('@/modules/laboratory/services/lab.service', () => labServiceMock);
vi.mock('react-hot-toast', () => ({ default: toast }));

const request = {
  id: 1,
  request_number: 'LAB-2026-0001',
  patient_id: 10,
  patient_name: 'Maria Garcia',
  doctor_id: 5,
  doctor_name: 'Dr. Perez',
  priority: 'urgent' as const,
  status: 'pending' as const,
  notes: '',
  lab_type: 'internal' as const,
  lab_area_id: 1,
  requested_at: '2026-08-10T10:00:00.000Z',
  created_at: '2026-08-10T10:00:00.000Z',
  updated_at: '2026-08-10T10:00:00.000Z',
};

const area = {
  id: 1,
  name: 'Hematologia',
  code: 'HEM' as const,
  description: '',
  icon: 'blood',
  color: '#ef4444',
  sort_order: 1,
  active: true,
};

const notification = {
  id: 1,
  type: 'sla_breach' as const,
  title: 'SLA vencido',
  message: 'Solicitud excede el tiempo',
  severity: 'critical' as const,
  acknowledged: false,
  acknowledged_by: null,
  acknowledged_at: null,
  created_at: '2026-08-11T10:00:00.000Z',
};

function makeData() {
  return {
    metrics: {
      pending: 2,
      received: 1,
      in_progress: 3,
      pending_validation: 1,
      validated: 0,
      delivered: 0,
      rejected: 0,
      repeated: 0,
      urgent: 1,
      critical_unvalidated: 0,
      average_processing_time_min: 40,
      samples_processed_today: 12,
      productivity_per_hour: 4,
      sla_breached: 0,
      sla_at_risk: 1,
    },
  };
}

function renderPage() {
  return render(
    <MemoryRouter>
      <AppThemeProvider>
        <LabDashboardPage />
      </AppThemeProvider>
    </MemoryRouter>,
  );
}

describe('LabDashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hooks.useLabSSE.mockReturnValue({ events: [], isConnected: false, clearEvents: vi.fn() });
    hooks.useLabFilters.mockReturnValue({
      filters: { status: '', search: '', priority: '', areaId: '', dateFrom: '', dateTo: '', doctorId: '', technicianId: '', isCritical: false, isRepeated: false, onlyUrgent: false },
      updateFilter: vi.fn(),
      resetFilters: vi.fn(),
      hasActiveFilters: false,
    });
    hooks.useLabAreas.mockReturnValue({ data: [area], isLoading: false });
    hooks.useLabNotifications.mockReturnValue({ data: [notification], isLoading: false });
    hooks.useUpdateLabRequestStatus.mockReturnValue({ mutate: vi.fn(), isPending: false });
    hooks.useLabDashboard.mockReturnValue({ data: makeData().metrics, isLoading: false, error: null, refetch: vi.fn() });
    hooks.useLabRequests.mockReturnValue({ data: { data: [request], total: 1 }, isLoading: false, error: null, refetch: vi.fn() });
  });

  it('renders the loading state while fetching', () => {
    hooks.useLabDashboard.mockReturnValue({ data: undefined, isLoading: true, error: null, refetch: vi.fn() });
    renderPage();
    expect(screen.getByText('loading_panel')).toBeInTheDocument();
  });

  it('renders the error state when metrics fail', () => {
    hooks.useLabDashboard.mockReturnValue({ data: undefined, isLoading: false, error: new Error('network'), refetch: vi.fn() });
    renderPage();
    expect(screen.getByText('network')).toBeInTheDocument();
  });

  it('renders the error state when requests fail', () => {
    hooks.useLabRequests.mockReturnValue({ data: undefined, isLoading: false, error: new Error('boom'), refetch: vi.fn() });
    renderPage();
    expect(screen.getByText('boom')).toBeInTheDocument();
  });

  it('renders the empty state when there are no requests', () => {
    hooks.useLabRequests.mockReturnValue({ data: { data: [], total: 0 }, isLoading: false, error: null, refetch: vi.fn() });
    renderPage();
    expect(screen.getByText('no_requests_title')).toBeInTheDocument();
  });

  it('renders the kanban board with requests and online indicator', () => {
    hooks.useLabSSE.mockReturnValue({ events: [], isConnected: true, clearEvents: vi.fn() });
    renderPage();
    expect(screen.getByText('online')).toBeInTheDocument();
    expect(screen.getByText('LAB-2026-0001')).toBeInTheDocument();
    // Kanban column header from LAB_STATUS_LABELS
    expect(screen.getByText('Pendiente')).toBeInTheDocument();
    // AlertsPanel notification title
    expect(screen.getByText('SLA vencido')).toBeInTheDocument();
  });

  it('switches to the table (WorkQueue) view', () => {
    const { container } = renderPage();
    const toggleGroup = container.querySelector('.MuiToggleButtonGroup-root');
    expect(toggleGroup).not.toBeNull();
    const buttons = within(toggleGroup as HTMLElement).getAllByRole('button');
    fireEvent.click(buttons[1]);
    // WorkQueue renders the request row in table mode
    expect(screen.getByText('Maria Garcia')).toBeInTheDocument();
  });

  it('switches to the metrics view showing area cards', () => {
    const { container } = renderPage();
    const toggleGroup = container.querySelector('.MuiToggleButtonGroup-root');
    const buttons = within(toggleGroup as HTMLElement).getAllByRole('button');
    fireEvent.click(buttons[2]);
    expect(screen.getByText('metrics_by_area')).toBeInTheDocument();
    expect(screen.getByText('Hematologia')).toBeInTheDocument();
  });

  it('shows a snackbar for a non-critical SSE event', () => {
    hooks.useLabSSE.mockReturnValue({ events: [{ type: 'sla_breach', payload: { id: 1 } }], isConnected: true, clearEvents: vi.fn() });
    renderPage();
    expect(screen.getByText('sla_breach: {"id":1}')).toBeInTheDocument();
  });

  it('toasts an error for a critical_result SSE event', () => {
    hooks.useLabSSE.mockReturnValue({ events: [{ type: 'critical_result', payload: { id: 9 } }], isConnected: true, clearEvents: vi.fn() });
    renderPage();
    expect(toast.error).toHaveBeenCalledWith('critical_result');
  });
});
