import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AppThemeProvider } from '@/shared/providers/ThemeProvider';
import LabRequestsPage from '@/modules/laboratory/pages/LabRequestsPage';

const hooks = vi.hoisted(() => ({
  useLabRequests: vi.fn(),
  useCreateLabRequest: vi.fn(),
}));

const auth = vi.hoisted(() => ({
  user: { id: 1, role: 'admin', name: 'Admin', email: 'admin@clinic.com', tenant_id: 1 },
  isAuthenticated: true,
  isLoading: false,
  hasPermission: vi.fn(() => true),
  login: vi.fn(),
  logout: vi.fn(),
  logoutAll: vi.fn(),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: unknown) => (typeof opts === 'string' ? opts : key),
    i18n: { changeLanguage: vi.fn() },
  }),
  initReactI18next: { type: '3rdParty', init: () => undefined },
}));
vi.mock('@/shared/providers/AuthProvider', () => ({ useAuth: () => auth }));
vi.mock('@/modules/laboratory/hooks/useLab', () => hooks);

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

const areas = [
  { id: 1, name: 'Hematologia', code: 'HEM' as const, description: '', icon: 'blood', color: '#ef4444', sort_order: 1, active: true },
];

const tests = [
  { id: 1, name: 'Hemograma', code: 'HEM001', category: 'Hematologia', description: '', price: 100, unit: '', reference_min: null, reference_max: null, reference_ranges: {}, active: true, sort_order: 1 },
];

function renderPage() {
  return render(
    <MemoryRouter>
      <AppThemeProvider>
        <LabRequestsPage />
      </AppThemeProvider>
    </MemoryRouter>,
  );
}

describe('LabRequestsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.user = { id: 1, role: 'admin', name: 'Admin', email: 'admin@clinic.com', tenant_id: 1 };
    hooks.useLabRequests.mockReturnValue({ data: { data: [request], total: 1 }, isLoading: false, error: null, refetch: vi.fn() });
    hooks.useCreateLabRequest.mockReturnValue({ mutate: vi.fn(), isPending: false });
  });

  it('renders the loading state while fetching', () => {
    hooks.useLabRequests.mockReturnValue({ data: undefined, isLoading: true, error: null, refetch: vi.fn() });
    renderPage();
    expect(screen.getByText('loading')).toBeInTheDocument();
  });

  it('renders the error state when the query fails', () => {
    hooks.useLabRequests.mockReturnValue({ data: undefined, isLoading: false, error: new Error('unexpected'), refetch: vi.fn() });
    renderPage();
    expect(screen.getByText('unexpected')).toBeInTheDocument();
  });

  it('renders the empty state when there are no requests', () => {
    hooks.useLabRequests.mockReturnValue({ data: { data: [], total: 0 }, isLoading: false, error: null, refetch: vi.fn() });
    renderPage();
    expect(screen.getByText('no_requests_title')).toBeInTheDocument();
  });

  it('renders the requests table with data', () => {
    renderPage();
    expect(screen.getByText('LAB-2026-0001')).toBeInTheDocument();
    expect(screen.getByText('Maria Garcia')).toBeInTheDocument();
    expect(screen.getByText('Dr. Perez')).toBeInTheDocument();
    expect(screen.getByText('Pendiente')).toBeInTheDocument();
  });

  it('does not render the create button for technicians', () => {
    auth.user = { id: 1, role: 'lab_tech', name: 'Tec', email: 'tec@clinic.com', tenant_id: 1 };
    renderPage();
    expect(screen.queryByText('new_request')).not.toBeInTheDocument();
  });

  it('opens the create dialog and submits a new request', async () => {
    const mutate = vi.fn();
    hooks.useCreateLabRequest.mockReturnValue({ mutate, isPending: false });
    renderPage();

    fireEvent.click(screen.getByText('new_request'));
    expect(screen.getByText('dialog_title')).toBeInTheDocument();

    const patientInput = screen.getByRole('spinbutton', { name: 'patient_id_label' });
    fireEvent.change(patientInput, { target: { value: '7' } });

    const testInput = screen.getByRole('textbox', { name: 'test_ids_label' });
    fireEvent.change(testInput, { target: { value: '1,2' } });

    fireEvent.submit(document.getElementById('create-lab-request-form') as HTMLFormElement);

    await waitFor(() => expect(mutate).toHaveBeenCalledTimes(1));
    const [payload, options] = mutate.mock.calls[0];
    expect(payload.patient_id).toBe(7);
    expect(payload.test_ids).toEqual([1, 2]);
    expect(typeof options.onSuccess).toBe('function');
  });

  it('filters the table with the search input', () => {
    renderPage();
    fireEvent.change(screen.getByPlaceholderText('search_placeholder'), { target: { value: 'LAB-2026' } });
    expect(screen.getByText('LAB-2026-0001')).toBeInTheDocument();
    expect(hooks.useLabRequests).toHaveBeenLastCalledWith(
      expect.objectContaining({ search: 'LAB-2026', page: 1 }),
    );
  });
});
