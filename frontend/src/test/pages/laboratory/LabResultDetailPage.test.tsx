import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AppThemeProvider } from '@/shared/providers/ThemeProvider';
import LabResultDetailPage from '@/modules/laboratory/pages/LabResultDetailPage';

const service = vi.hoisted(() => ({ getLabRequestById: vi.fn() }));

const auth = vi.hoisted(() => ({
  user: { id: 1, role: 'patient', name: 'Paciente', email: 'p@clinic.com', tenant_id: 1 },
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
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useParams: () => ({ id: '1' }) };
});
vi.mock('@/shared/providers/AuthProvider', () => ({ useAuth: () => auth }));
vi.mock('@/modules/laboratory/services/lab.service', () => service);

const request = {
  id: 1,
  request_number: 'LAB-2026-0001',
  patient_id: 10,
  patient_name: 'Maria Garcia',
  doctor_name: 'Dr. Perez',
  priority: 'normal',
  status: 'delivered',
  notes: 'Sin novedades',
  lab_type: 'internal',
  lab_area_id: 1,
  requested_at: '2026-08-10T10:00:00.000Z',
  created_at: '2026-08-10T10:00:00.000Z',
  updated_at: '2026-08-10T10:00:00.000Z',
  items: [
    {
      id: 1,
      lab_request_id: 1,
      lab_test_id: 1,
      lab_area_id: 1,
      priority: 'normal',
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
  ],
};

function renderPage() {
  return render(
    <MemoryRouter>
      <AppThemeProvider>
        <LabResultDetailPage />
      </AppThemeProvider>
    </MemoryRouter>,
  );
}

describe('LabResultDetailPage', () => {
  it('renders the error alert when the request fails', async () => {
    service.getLabRequestById.mockRejectedValue(new Error('fail'));
    renderPage();
    expect(await screen.findByText('lab_result_detail:errorLoading')).toBeInTheDocument();
  });

  it('renders the not-found alert when no request is returned', async () => {
    service.getLabRequestById.mockResolvedValue(null);
    renderPage();
    expect(await screen.findByText('lab_result_detail:notFound')).toBeInTheDocument();
  });

  it('renders the patient results with item rows', async () => {
    service.getLabRequestById.mockResolvedValue(request);
    renderPage();
    // "Hemograma" appears both in the PageHeader title and the item row
    const matches = await screen.findAllByText('Hemograma');
    expect(matches.length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('14.2')).toBeInTheDocument();
    expect(screen.getByText('13.5 - 17.5')).toBeInTheDocument();
    expect(screen.getByText('g/dL')).toBeInTheDocument();
    // Back action and status chip
    expect(screen.getByText('lab_result_detail:back')).toBeInTheDocument();
    expect(screen.getByText('delivered')).toBeInTheDocument();
  });
});
