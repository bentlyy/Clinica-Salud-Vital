import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AppThemeProvider } from '@/shared/providers/ThemeProvider';
import AdminLabRequestsPage from '@/modules/laboratory/pages/AdminLabRequestsPage';

const service = vi.hoisted(() => ({ getLabRequests: vi.fn() }));
const navigateMock = vi.hoisted(() => vi.fn());

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: unknown) => (typeof opts === 'string' ? opts : key),
    i18n: { changeLanguage: vi.fn() },
  }),
  initReactI18next: { type: '3rdParty', init: () => undefined },
}));
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigateMock };
});
vi.mock('@/modules/laboratory/services/lab.service', () => service);

const requests = [
  {
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
  },
  {
    id: 2,
    request_number: 'LAB-2026-0002',
    patient_id: 11,
    patient_name: 'Juan Lopez',
    doctor_id: 5,
    doctor_name: 'Dr. Perez',
    priority: 'normal',
    status: 'delivered',
    notes: '',
    lab_type: 'internal',
    lab_area_id: 2,
    requested_at: '2026-08-11T10:00:00.000Z',
    created_at: '2026-08-11T10:00:00.000Z',
    updated_at: '2026-08-11T10:00:00.000Z',
  },
  {
    id: 3,
    request_number: 'LAB-2026-0003',
    patient_id: 12,
    patient_name: 'Ana Torres',
    doctor_id: null,
    doctor_name: '',
    priority: 'emergency',
    status: 'cancelled',
    notes: '',
    lab_type: 'internal',
    lab_area_id: 1,
    requested_at: '2026-08-12T10:00:00.000Z',
    created_at: '2026-08-12T10:00:00.000Z',
    updated_at: '2026-08-12T10:00:00.000Z',
  },
];

function renderPage() {
  return render(
    <MemoryRouter>
      <AppThemeProvider>
        <AdminLabRequestsPage />
      </AppThemeProvider>
    </MemoryRouter>,
  );
}

describe('AdminLabRequestsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the loading state while fetching', () => {
    service.getLabRequests.mockReturnValue(new Promise(() => {}));
    const { container } = renderPage();
    expect(container.querySelectorAll('.MuiSkeleton-root').length).toBe(3);
  });

  it('groups requests by doctor and renders the tables', async () => {
    service.getLabRequests.mockResolvedValue(requests);
    renderPage();
    // Group headers: Dr. Perez and the no-doctor fallback key
    expect(await screen.findByText('Dr. Perez')).toBeInTheDocument();
    expect(screen.getByText('admin_lab_requests:noDoctor')).toBeInTheDocument();
    // Rows
    expect(screen.getByText('LAB-2026-0001')).toBeInTheDocument();
    expect(screen.getByText('Maria Garcia')).toBeInTheDocument();
    expect(screen.getByText('LAB-2026-0003')).toBeInTheDocument();
    // Status/priority chips render raw values
    expect(screen.getByText('delivered')).toBeInTheDocument();
    expect(screen.getByText('cancelled')).toBeInTheDocument();
    // View actions
    expect(screen.getAllByText('admin_lab_requests:view').length).toBe(3);
  });

  it('navigates to the request detail when clicking view', async () => {
    service.getLabRequests.mockResolvedValue([requests[0]]);
    renderPage();
    fireEvent.click(await screen.findByText('admin_lab_requests:view'));
    expect(navigateMock).toHaveBeenCalledWith('/laboratory/requests/1');
  });

  it('renders the empty state when there are no requests', async () => {
    service.getLabRequests.mockResolvedValue([]);
    renderPage();
    expect(await screen.findByText('admin_lab_requests:emptyTitle')).toBeInTheDocument();
    expect(screen.getByText('admin_lab_requests:emptyDesc')).toBeInTheDocument();
  });

  it('renders the empty state when the request fails', async () => {
    service.getLabRequests.mockRejectedValue(new Error('boom'));
    renderPage();
    expect(await screen.findByText('admin_lab_requests:emptyTitle')).toBeInTheDocument();
  });
});
