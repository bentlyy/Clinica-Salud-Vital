import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SuperAdminDemoDataPage from '@/modules/super-admin/pages/SuperAdminDemoDataPage';

const mockGet = vi.hoisted(() => vi.fn());
const mockToast = vi.hoisted(() => vi.fn());

vi.mock('@/shared/services/api-client', () => ({ apiClient: { get: mockGet } }));

vi.mock('react-hot-toast', () => ({ default: { success: mockToast } }));

vi.mock('@/i18n/i18n', () => ({ default: { language: 'es', on: vi.fn() } }));

// Every string in this page uses t(key, defaultValue) or t(key, { defaultValue }),
// so the generic t below resolves default values.
vi.mock('react-i18next', () => {
  // Stable `t` identity (defined once per module).
  const t = (key: string, opts?: Record<string, unknown> | string) => {
    if (typeof opts === 'string') return opts;
    if (opts && typeof opts === 'object' && 'defaultValue' in opts) {
      return String(opts.defaultValue);
    }
    return key;
  };
  return {
    useTranslation: () => ({ t, i18n: { language: 'es' } }),
  };
});

const tenant = { id: 't1', name: 'Clínica Demo', plan: 'pro', total_users: 12 };

function mockApiResponses() {
  mockGet.mockImplementation((url: string) => {
    if (url === '/bookings') {
      return Promise.resolve({
        data: [
          { id: 1, date: '2026-08-01', time: '09:00', status: 'confirmed', doctor_name: 'Dra. Ana', specialty: 'Cardiología', patient_name: 'Paciente Uno', patient_rut: '11.111.111-1' },
        ],
      });
    }
    if (url === '/clinical-records') {
      return Promise.resolve({
        data: [
          { id: 1, doctor_name: 'Dra. Ana', patient_name: 'Paciente Dos', patient_rut: '22.222.222-2', diagnosis: 'Hipertensión', created_at: '2026-08-01T09:00:00Z', status: 'completed' },
        ],
      });
    }
    if (url === '/laboratory/requests') {
      return Promise.resolve({
        data: [
          { id: 1, request_number: 'LAB-001', doctor_name: 'Dr. Luis', patient_name: 'Paciente Tres', status: 'pending', priority: 'alta', created_at: '2026-08-01T09:00:00Z' },
        ],
      });
    }
    if (url === '/super-admin/tenants') {
      return Promise.resolve({ data: [tenant] });
    }
    return Promise.resolve({ data: [] });
  });
}

function renderPage() {
  return render(<SuperAdminDemoDataPage />);
}

describe('SuperAdminDemoDataPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApiResponses();
  });

  it('shows loading while fetching demo data', () => {
    mockGet.mockImplementation(() => new Promise(() => undefined));
    renderPage();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders tenant cards and the bookings table', async () => {
    renderPage();
    expect(await screen.findByText('Clínica Demo')).toBeInTheDocument();
    expect(screen.getByText('Paciente Uno')).toBeInTheDocument();
    expect(screen.getByText('Dra. Ana')).toBeInTheDocument();
    expect(screen.getByText('confirmed')).toBeInTheDocument();
    expect(screen.getByText('Cardiología')).toBeInTheDocument();
  });

  it('switches to the clinical records tab', async () => {
    renderPage();
    await screen.findByText('Clínica Demo');
    fireEvent.click(screen.getByRole('tab', { name: 'clinicalHistoryCount' }));
    expect(screen.getByText('Paciente Dos')).toBeInTheDocument();
    expect(screen.getByText('Hipertensión')).toBeInTheDocument();
  });

  it('switches to the lab requests tab', async () => {
    renderPage();
    await screen.findByText('Clínica Demo');
    fireEvent.click(screen.getByRole('tab', { name: 'examsCount' }));
    expect(screen.getByText('LAB-001')).toBeInTheDocument();
    expect(screen.getByText('Paciente Tres')).toBeInTheDocument();
  });

  it('loads demo data for a tenant and shows a toast', async () => {
    renderPage();
    await screen.findByText('Clínica Demo');
    fireEvent.click(screen.getByRole('button', { name: 'Cargar' }));
    expect(mockToast).toHaveBeenCalledWith('Datos demo cargados para Clínica Demo');
  });

  it('cleans all demo data and shows a toast', async () => {
    renderPage();
    await screen.findByText('Clínica Demo');
    fireEvent.click(screen.getByRole('button', { name: 'Limpiar Todo' }));
    expect(mockToast).toHaveBeenCalledWith('Datos demo limpiados en todos los tenants');
  });
});
