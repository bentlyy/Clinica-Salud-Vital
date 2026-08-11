import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AppThemeProvider } from '@/shared/providers/ThemeProvider';
import LabRequestDetailPage from '@/modules/laboratory/pages/LabRequestDetailPage';

const hooks = vi.hoisted(() => ({
  useLabRequestDetail: vi.fn(),
  useLabRequestItems: vi.fn(),
  useSamples: vi.fn(),
  useEnterResult: vi.fn(),
  useValidateTech: vi.fn(),
  useValidateDoctor: vi.fn(),
  useDeliverResult: vi.fn(),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: unknown) => (typeof opts === 'string' ? opts : key),
    i18n: { changeLanguage: vi.fn() },
  }),
  initReactI18next: { type: '3rdParty', init: () => undefined },
}));
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useParams: () => ({ id: '1' }) };
});
vi.mock('@/shared/providers/AuthProvider', () => ({
  useAuth: () => ({
    user: { id: 1, role: 'admin', name: 'Admin', email: 'admin@clinic.com', tenant_id: 1 },
    isAuthenticated: true,
    isLoading: false,
    hasPermission: vi.fn(() => true),
    login: vi.fn(),
    logout: vi.fn(),
    logoutAll: vi.fn(),
  }),
}));
vi.mock('@/modules/laboratory/hooks/useLab', () => hooks);

const request = {
  id: 1,
  request_number: 'LAB-2026-0001',
  patient_id: 10,
  patient_name: 'Maria Garcia',
  doctor_id: 5,
  doctor_name: 'Dr. Perez',
  priority: 'urgent',
  status: 'pending',
  notes: 'Ayuno 8h',
  lab_type: 'internal',
  lab_area_id: 1,
  requested_at: '2026-08-10T10:00:00.000Z',
  created_at: '2026-08-10T10:00:00.000Z',
  updated_at: '2026-08-10T10:00:00.000Z',
};

const items = [
  {
    id: 1,
    lab_request_id: 1,
    lab_test_id: 1,
    lab_area_id: 1,
    priority: 'urgent',
    status: 'result_entered',
    result_value: '14.2',
    result_notes: null,
    notes: null,
    results: {},
    unit: 'g/dL',
    is_critical: false,
    is_repeated: false,
    delta_check_status: null,
    validated_by_tech: null,
    validated_at_tech: null,
    validated_by_doctor: null,
    validated_at_doctor: null,
    signed_by: null,
    signed_at: null,
    delivered_at: null,
    delivery_method: null,
    completed_at: null,
    assigned_tech_id: null,
    created_at: '2026-08-10T10:00:00.000Z',
    test_name: 'Hemograma',
    reference_range: '13.5 - 17.5',
  },
];

const samples = [
  {
    id: 1,
    lab_request_id: 1,
    sample_code: 'M-001',
    sample_type: 'Sangre',
    status: 'received',
    reception_time: '2026-08-10T10:00:00.000Z',
    storage_location: 'F1',
    created_at: '2026-08-10T10:00:00.000Z',
  },
];

const mutation = { mutate: vi.fn(), isPending: false, reset: vi.fn(), isError: false, error: null };

function renderPage() {
  return render(
    <MemoryRouter>
      <AppThemeProvider>
        <LabRequestDetailPage />
      </AppThemeProvider>
    </MemoryRouter>,
  );
}

describe('LabRequestDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hooks.useLabRequestDetail.mockReturnValue({ data: request, isLoading: false, error: null, refetch: vi.fn() });
    hooks.useLabRequestItems.mockReturnValue({ data: items, isLoading: false });
    hooks.useSamples.mockReturnValue({ data: samples, isLoading: false });
    hooks.useEnterResult.mockReturnValue({ ...mutation });
    hooks.useValidateTech.mockReturnValue({ ...mutation });
    hooks.useValidateDoctor.mockReturnValue({ ...mutation });
    hooks.useDeliverResult.mockReturnValue({ ...mutation });
  });

  it('renders the loading state while fetching', () => {
    hooks.useLabRequestDetail.mockReturnValue({ data: null, isLoading: true, error: null, refetch: vi.fn() });
    renderPage();
    expect(screen.getByText('loading')).toBeInTheDocument();
  });

  it('renders the error state when the request fails', () => {
    hooks.useLabRequestDetail.mockReturnValue({ data: null, isLoading: false, error: new Error('detail down'), refetch: vi.fn() });
    renderPage();
    expect(screen.getByText('detail down')).toBeInTheDocument();
  });

  it('renders the not-found state when no request is returned', () => {
    hooks.useLabRequestDetail.mockReturnValue({ data: null, isLoading: false, error: null, refetch: vi.fn() });
    renderPage();
    expect(screen.getByText('error_not_found_title')).toBeInTheDocument();
  });

  it('renders the request detail with timeline, info, samples and results', () => {
    renderPage();
    // Header
    expect(screen.getByText('LAB-2026-0001')).toBeInTheDocument();
    expect(screen.getByText('Maria Garcia — Dr. Perez')).toBeInTheDocument();
    // Info chips (LAB_STATUS_CONFIG / LAB_PRIORITY_CONFIG hardcoded labels).
    // "Pendiente" appears both in the Stepper step and the status chip.
    expect(screen.getAllByText('Pendiente').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Urgente')).toBeInTheDocument();
    // Samples table
    expect(screen.getByText('M-001')).toBeInTheDocument();
    expect(screen.getByText('Sangre')).toBeInTheDocument();
    // Results table
    expect(screen.getByText('Hemograma')).toBeInTheDocument();
    expect(screen.getByText('14.2')).toBeInTheDocument();
    expect(screen.getByText('g/dL')).toBeInTheDocument();
    // Actions available for the admin role
    expect(screen.getByText('back')).toBeInTheDocument();
    expect(screen.getByText('add_results')).toBeInTheDocument();
    expect(screen.getByText('validate_tech')).toBeInTheDocument();
  });

  it('validates the first result-entered item', () => {
    renderPage();
    fireEvent.click(screen.getByText('validate_tech'));
    expect(hooks.useValidateTech().mutate).toHaveBeenCalledWith({ requestId: 1, itemId: 1 });
  });

  it('opens the add-results dialog', () => {
    renderPage();
    fireEvent.click(screen.getByText('add_results'));
    expect(screen.getByText('dialog_title')).toBeInTheDocument();
    expect(screen.getByText('cancel')).toBeInTheDocument();
  });
});
