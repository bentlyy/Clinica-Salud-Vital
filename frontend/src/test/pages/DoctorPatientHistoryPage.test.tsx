import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AppThemeProvider } from '@/shared/providers/ThemeProvider';
import DoctorPatientHistoryPage from '@/modules/doctors/pages/DoctorPatientHistoryPage';

const apiClient = vi.hoisted(() => ({ get: vi.fn() }));
const searchParamsMock = vi.hoisted(() => ({ get: vi.fn(() => null) }));

vi.mock('@/shared/services/api-client', () => ({ apiClient }));

vi.mock('@/shared/utils/pdf', () => ({
  downloadLabOrderPdf: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useSearchParams: () => [searchParamsMock] };
});

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        'patient_history:title': 'Historial del paciente',
        'patient_history:selectPatient': 'Selecciona un paciente',
        'patient_history:selectPatientDesc': 'Usa el botón de historial en una solicitud para ver el detalle.',
        'patient_history:tabRecords': 'Registros ({{count}})',
        'patient_history:tabExams': 'Exámenes ({{count}})',
        'patient_history:noRecords': 'Sin registros clínicos',
        'patient_history:noRecordsDesc': 'No hay registros para este paciente.',
        'patient_history:noExams': 'Sin exámenes',
        'patient_history:noExamsDesc': 'No hay solicitudes de laboratorio.',
        'patient_history:detailTitle': 'Detalle del {{date}}',
        'patient_history:chiefComplaint': 'Motivo de consulta',
        'patient_history:anamnesis': 'Anamnesis',
        'patient_history:diagnosis': 'Diagnóstico',
        'patient_history:treatmentPlan': 'Plan de tratamiento',
        'patient_history:backToList': 'Volver a la lista',
        'patient_history:noDiagnosis': 'Sin diagnóstico',
        'patient_history:priority': 'Prioridad',
        'patient_history:downloadPdf': 'Descargar PDF',
        'patient_history:patientLabel': 'Paciente #{{id}}',
      };
      const value = translations[key] ?? key;
      if (opts && value.includes('{{')) {
        return value.replace(/\{\{(\w+)\}\}/g, (_, name: string) => String(opts[name] ?? ''));
      }
      return value;
    },
    i18n: { language: 'es' },
  }),
}));

const patient = { id: 10, name: 'Maria Garcia', email: 'maria@x.cl', rut: '11.111.111-1', phone: '+56911111111' };

const record = {
  id: 1,
  doctor_name: 'Dr. Perez',
  diagnosis: 'Migraña',
  chief_complaint: 'Dolor de cabeza',
  anamnesis: 'Cefalea recurrente',
  treatment_plan: 'Reposo',
  created_at: '2026-08-01T10:00:00Z',
  status: 'completed',
};

const labRequest = {
  id: 1,
  request_number: 'LAB-001',
  test_type: 'Hemograma',
  status: 'pending',
  priority: 'normal',
  created_at: '2026-08-01T10:00:00Z',
};

function mockDataLoaded() {
  apiClient.get.mockImplementation((url: string) => {
    if (url === '/patients/10') return Promise.resolve({ data: patient });
    if (url === '/clinical-records') return Promise.resolve({ data: { items: [record] } });
    if (url === '/laboratory/requests') return Promise.resolve({ data: { items: [labRequest] } });
    return Promise.reject(new Error('unexpected url'));
  });
}

function renderPage() {
  return render(
    <MemoryRouter>
      <AppThemeProvider>
        <DoctorPatientHistoryPage />
      </AppThemeProvider>
    </MemoryRouter>,
  );
}

describe('DoctorPatientHistoryPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    searchParamsMock.get.mockReturnValue(null);
  });

  it('shows an empty state when no patientId is provided', () => {
    renderPage();
    expect(screen.getByText('Selecciona un paciente')).toBeInTheDocument();
    expect(apiClient.get).not.toHaveBeenCalled();
  });

  it('shows a loading indicator while fetching the patient data', () => {
    searchParamsMock.get.mockReturnValue('10');
    apiClient.get.mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(document.querySelector('.MuiCircularProgress-root')).toBeInTheDocument();
  });

  it('renders the patient header and clinical records', async () => {
    searchParamsMock.get.mockReturnValue('10');
    mockDataLoaded();
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Maria Garcia')).toBeInTheDocument();
    });
    expect(screen.getByText('Migraña')).toBeInTheDocument();
    expect(screen.getByText(/Dr. Perez/)).toBeInTheDocument();
  });

  it('shows a detail view when a record is selected', async () => {
    searchParamsMock.get.mockReturnValue('10');
    mockDataLoaded();
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Migraña')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Migraña'));
    await waitFor(() => {
      expect(screen.getByText('Dolor de cabeza')).toBeInTheDocument();
    });
    expect(screen.getByText('Cefalea recurrente')).toBeInTheDocument();
    expect(screen.getByText('Reposo')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Volver a la lista'));
    expect(screen.queryByText('Dolor de cabeza')).not.toBeInTheDocument();
  });

  it('switches to the lab tab and lists lab requests', async () => {
    searchParamsMock.get.mockReturnValue('10');
    mockDataLoaded();
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Maria Garcia')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/Exámenes/));
    await waitFor(() => {
      expect(screen.getByText('Hemograma')).toBeInTheDocument();
    });
    expect(screen.getByText(/Prioridad: normal/)).toBeInTheDocument();
  });
});
