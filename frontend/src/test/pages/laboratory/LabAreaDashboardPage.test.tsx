import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AppThemeProvider } from '@/shared/providers/ThemeProvider';
import LabAreaDashboardPage from '@/modules/laboratory/pages/LabAreaDashboardPage';

const hooks = vi.hoisted(() => ({
  useAreaDashboard: vi.fn(),
  useLabEquipment: vi.fn(),
  useQCRecords: vi.fn(),
  useLabRequests: vi.fn(),
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
  return { ...actual, useParams: () => ({ areaId: '1' }) };
});
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
  notes: '',
  lab_type: 'internal',
  lab_area_id: 1,
  requested_at: '2026-08-10T10:00:00.000Z',
  created_at: '2026-08-10T10:00:00.000Z',
  updated_at: '2026-08-10T10:00:00.000Z',
};

const areaDashboard = {
  area: { id: 1, name: 'Hematología', code: 'HEM' },
  metrics: { pending: 3, in_progress: 2, validated: 5, urgent: 1, sla_breached: 0 },
  queue: [request],
};

const equipment = [{ id: 1, name: 'Autoanalizador XN-1000', status: 'online', area_id: 1, model: 'XN-1000', serial_number: 'SN-1' }];

const qcRecords = [{ id: 1, lab_test_id: 1, control_name: 'Control Hemograma N1', lot_number: 'LOT-2026-01', status: 'passed', performed_at: '2026-08-10T10:00:00.000Z' }];

function renderPage() {
  return render(
    <MemoryRouter>
      <AppThemeProvider>
        <LabAreaDashboardPage />
      </AppThemeProvider>
    </MemoryRouter>,
  );
}

describe('LabAreaDashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hooks.useAreaDashboard.mockReturnValue({ data: areaDashboard, isLoading: false, error: null, refetch: vi.fn() });
    hooks.useLabEquipment.mockReturnValue({ data: equipment, isLoading: false });
    hooks.useQCRecords.mockReturnValue({ data: qcRecords, isLoading: false });
    hooks.useLabRequests.mockReturnValue({ data: { data: [] } });
  });

  it('renders the loading state while fetching', () => {
    hooks.useAreaDashboard.mockReturnValue({ data: null, isLoading: true, error: null, refetch: vi.fn() });
    renderPage();
    expect(screen.getByText('loading_area')).toBeInTheDocument();
  });

  it('renders the error state when the dashboard query fails', () => {
    hooks.useAreaDashboard.mockReturnValue({ data: null, isLoading: false, error: new Error('area down'), refetch: vi.fn() });
    renderPage();
    expect(screen.getByText('area down')).toBeInTheDocument();
  });

  it('renders the not-found state when no area dashboard is returned', () => {
    hooks.useAreaDashboard.mockReturnValue({ data: null, isLoading: false, error: null, refetch: vi.fn() });
    renderPage();
    expect(screen.getByText('error_not_found_title')).toBeInTheDocument();
  });

  it('renders metrics, work queue, equipment and recent QC results', () => {
    renderPage();
    // Area title from area.name
    expect(screen.getByText('Hematología')).toBeInTheDocument();
    // Metric labels (t keys) and quick actions
    expect(screen.getAllByText('pending').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('sla_breached').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('sample_reception')).toBeInTheDocument();
    expect(screen.getByText('quality_control')).toBeInTheDocument();
    // Work queue request
    expect(screen.getByText('LAB-2026-0001')).toBeInTheDocument();
    expect(screen.getByText('Maria Garcia')).toBeInTheDocument();
    // Equipment card
    expect(screen.getByText('Autoanalizador XN-1000')).toBeInTheDocument();
    // Recent QC record
    expect(screen.getByText('Control Hemograma N1')).toBeInTheDocument();
    expect(screen.getByText('qc_passed')).toBeInTheDocument();
  });

  it('renders the empty equipment and QC states', () => {
    hooks.useLabEquipment.mockReturnValue({ data: [], isLoading: false });
    hooks.useQCRecords.mockReturnValue({ data: [], isLoading: false });
    renderPage();
    expect(screen.getByText('no_equipment')).toBeInTheDocument();
    expect(screen.getByText('no_qc_records')).toBeInTheDocument();
  });
});
