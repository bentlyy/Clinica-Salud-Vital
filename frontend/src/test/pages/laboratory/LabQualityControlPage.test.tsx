import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppThemeProvider } from '@/shared/providers/ThemeProvider';
import LabQualityControlPage from '@/modules/laboratory/pages/LabQualityControlPage';

const hooks = vi.hoisted(() => ({
  useQCRecords: vi.fn(),
  useLabEquipment: vi.fn(),
  useLabAreas: vi.fn(),
  useLabTests: vi.fn(),
  useLabReagents: vi.fn(),
  useCreateQCRecord: vi.fn(),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: unknown) => (typeof opts === 'string' ? opts : key),
    i18n: { changeLanguage: vi.fn() },
  }),
  initReactI18next: { type: '3rdParty', init: () => undefined },
}));
vi.mock('@/modules/laboratory/hooks/useLab', () => hooks);

const qcRecord = {
  id: 1,
  lab_test_id: 1,
  lab_area_id: 1,
  sample_id: null,
  equipment_id: null,
  reagent_id: null,
  qc_type: 'internal' as const,
  control_name: 'Control Hemograma N1',
  lot_number: 'LOT-001',
  expiration_date: '2027-01-01',
  measured_value: 14.2,
  expected_min: 13.5,
  expected_max: 15.5,
  status: 'warning' as const,
  performed_by: 1,
  reviewed_by: null,
  performed_at: '2026-08-10T10:00:00.000Z',
  reviewed_at: null,
  notes: null,
};

const qcRecord2 = {
  id: 2,
  lab_test_id: 1,
  lab_area_id: 1,
  sample_id: null,
  equipment_id: null,
  reagent_id: null,
  qc_type: 'internal' as const,
  control_name: 'Control Hemograma N2',
  lot_number: 'LOT-001',
  expiration_date: '2027-01-01',
  measured_value: 15.1,
  expected_min: 13.5,
  expected_max: 15.5,
  status: 'warning' as const,
  performed_by: 1,
  reviewed_by: null,
  performed_at: '2026-08-11T10:00:00.000Z',
  reviewed_at: null,
  notes: null,
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

const test = {
  id: 1,
  name: 'Hemograma',
  code: 'HEM001',
  category: 'Hematologia',
  description: '',
  price: 100,
  unit: '',
  reference_min: null,
  reference_max: null,
  reference_ranges: {},
  active: true,
  sort_order: 1,
};

const equipment = {
  id: 1,
  name: 'Autoanalizador XN-1000',
  model: 'XN-1000',
  serial_number: 'SN-001',
  status: 'online' as const,
  lab_area_id: 1,
};

const reagent = {
  id: 1,
  name: 'Reactivo Hemoglobina',
  lot_number: 'LOT-R1',
  expiration_date: '2027-06-01',
  stock: 50,
  min_stock: 10,
  unit: 'mL',
  lab_area_id: 1,
};

function renderPage() {
  return render(
    <AppThemeProvider>
      <LabQualityControlPage />
    </AppThemeProvider>,
  );
}

describe('LabQualityControlPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hooks.useQCRecords.mockReturnValue({ data: [qcRecord, qcRecord2], isLoading: false, error: null, refetch: vi.fn() });
    hooks.useLabEquipment.mockReturnValue({ data: [equipment], isLoading: false, error: null, refetch: vi.fn() });
    hooks.useLabAreas.mockReturnValue({ data: [area], isLoading: false });
    hooks.useLabTests.mockReturnValue({ data: [test], isLoading: false });
    hooks.useLabReagents.mockReturnValue({ data: [reagent], isLoading: false });
    hooks.useCreateQCRecord.mockReturnValue({ mutate: vi.fn(), isPending: false });
  });

  it('renders the loading state while fetching', () => {
    hooks.useQCRecords.mockReturnValue({ data: undefined, isLoading: true, error: null, refetch: vi.fn() });
    renderPage();
    expect(screen.getByText('loading')).toBeInTheDocument();
  });

  it('renders the error state when the query fails', () => {
    hooks.useQCRecords.mockReturnValue({ data: undefined, isLoading: false, error: new Error('qc error'), refetch: vi.fn() });
    renderPage();
    expect(screen.getByText('qc error')).toBeInTheDocument();
  });

  it('renders the empty state when there are no records', () => {
    hooks.useQCRecords.mockReturnValue({ data: [], isLoading: false, error: null, refetch: vi.fn() });
    renderPage();
    expect(screen.getByText('no_records_title')).toBeInTheDocument();
  });

  it('renders the validation worklist with QC records', () => {
    renderPage();
    expect(screen.getByText('Control Hemograma N1')).toBeInTheDocument();
    expect(screen.getByText('14.2')).toBeInTheDocument();
  });

  it('opens the QC creation form', () => {
    renderPage();
    fireEvent.click(screen.getByText('new_record'));
    expect(screen.getByText('save')).toBeInTheDocument();
    expect(screen.getAllByText('controlName').length).toBeGreaterThan(0);
  });

  it('switches to the control chart tab', () => {
    renderPage();
    fireEvent.click(screen.getByText('tab_chart'));
    expect(screen.getByText('passed')).toBeInTheDocument();
    expect(screen.getByText('failed')).toBeInTheDocument();
  });

  it('switches to the inventory tab showing equipment and reagents', () => {
    renderPage();
    fireEvent.click(screen.getByText('tab_inventory'));
    expect(screen.getByText('Autoanalizador XN-1000')).toBeInTheDocument();
    expect(screen.getByText('Reactivo Hemoglobina')).toBeInTheDocument();
  });
});
