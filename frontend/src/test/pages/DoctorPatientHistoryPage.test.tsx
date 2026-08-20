import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppThemeProvider } from '@/shared/providers/ThemeProvider';
import DoctorPatientHistoryPage from '@/modules/doctors/pages/DoctorPatientHistoryPage';

const apiClient = vi.hoisted(() => ({ get: vi.fn() }));
const searchParamsMock = vi.hoisted(() => ({ get: vi.fn(() => null) }));

vi.mock('@/shared/services/api-client', () => ({ apiClient }));

vi.mock('@/shared/utils/pdf', () => ({
  downloadLabOrderPdf: vi.fn(),
}));

vi.mock('@/i18n/i18n', () => ({
  default: { language: 'es', on: vi.fn() },
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
        'patient_history:detailTitle': 'Detalle del {{date}}',
        'patient_history:chiefComplaint': 'Motivo de consulta',
        'patient_history:anamnesis': 'Anamnesis',
        'patient_history:diagnosis': 'Diagnóstico',
        'patient_history:treatmentPlan': 'Plan de tratamiento',
        'patient_history:backToList': 'Volver a la lista',
        'patient_history:noDiagnosis': 'Sin diagnóstico',
        'patient_history:noRecords': 'Sin registros clínicos',
        'patient_history:noRecordsDesc': 'No hay registros para este paciente.',
        'patient_history:noExams': 'Sin exámenes',
        'patient_history:noExamsDesc': 'No hay solicitudes de laboratorio.',
        'patient_history:priority': 'Prioridad',
        'patient_history:downloadPdf': 'Descargar PDF',
        'patient_history:patientLabel': 'Paciente #{{id}}',
        'patient_ficha:title': 'Ficha del paciente',
        'patient_ficha:tabSummary': 'Resumen',
        'patient_ficha:tabBookings': 'Citas ({{count}})',
        'patient_ficha:tabHistory': 'Historial',
        'patient_ficha:tabPrescriptions': 'Recetas ({{count}})',
        'patient_ficha:tabAttachments': 'Adjuntos',
        'patient_ficha:tabLab': 'Laboratorio ({{count}})',
        'patient_ficha:summaryBookings': 'Citas',
        'patient_ficha:summaryRecords': 'Registros clínicos',
        'patient_ficha:summaryPrescriptions': 'Recetas',
        'patient_ficha:summaryLab': 'Exámenes',
        'patient_ficha:summaryAttachments': 'Adjuntos',
        'patient_ficha:noBookings': 'Sin citas registradas',
        'patient_ficha:noBookingsDesc': 'Este paciente no tiene citas asociadas.',
        'patient_ficha:noPrescriptions': 'Sin recetas',
        'patient_ficha:noPrescriptionsDesc': 'Este paciente no tiene recetas registradas.',
        'patient_ficha:noAttachmentsDesc': 'Adjunta documentos como órdenes o certificados.',
        'patient_ficha:medicalHistory': 'Antecedentes médicos',
        'patient_ficha:noMedicalHistory': 'Sin antecedentes médicos',
        'patient_ficha:noMedicalHistoryDesc': 'Este paciente no tiene antecedentes registrados.',
        'patient_ficha:recordDoctor': 'Dr. {{name}}',
        'patient_ficha:historyActive': 'Activo',
        'patient_ficha:historyResolved': 'Resuelto',
        'patient_ficha:historyChronic': 'Crónico',
        'patient_ficha:historyFamily': 'Familiar',
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
  doctor_name: 'Perez',
  diagnosis: 'Migraña',
  chief_complaint: 'Dolor de cabeza',
  anamnesis: 'Cefalea recurrente',
  treatment_plan: 'Reposo',
  created_at: '2026-08-01T10:00:00Z',
  status: 'completed',
};

const labRequest = {
  id: 1,
  patient_id: 10,
  request_number: 'LAB-001',
  test_type: 'Hemograma',
  status: 'pending',
  priority: 'normal',
  created_at: '2026-08-01T10:00:00Z',
};

const booking = {
  id: 1,
  patient_id: 10,
  guest_name: null,
  patient_name: 'Maria Garcia',
  date: '2026-08-01',
  time: '10:00',
  duration: 30,
  status: 'confirmed',
};

const rxRecord = {
  clinical_record_id: 1,
  patient_id: 10,
  doctor_name: 'Perez',
  created_at: '2026-08-01T10:00:00Z',
  medications: [{ name: 'Ibuprofeno', dosage: '400mg', frequency: 'cada 8h' }],
};

const medHistory = {
  id: 1,
  patient_id: 10,
  condition: 'Hipertensión',
  status: 'chronic',
  notes: 'Control mensual',
  onset_date: '2020-01-01',
  created_at: '2026-01-01T10:00:00Z',
};

function mockDataLoaded() {
  apiClient.get.mockImplementation((url: string) => {
    if (url === '/patients/10') return Promise.resolve({ data: patient });
    if (url === '/clinical-records') return Promise.resolve({ data: [record] });
    if (url === '/laboratory/requests') return Promise.resolve({ data: [labRequest] });
    if (url === '/medical-history/patient/10') return Promise.resolve({ data: [medHistory] });
    if (url === '/clinical-records/prescriptions/all') return Promise.resolve({ data: [rxRecord] });
    if (url === '/bookings/doctor') return Promise.resolve({ data: [booking] });
    if (url === '/attachments') return Promise.resolve({ data: { data: [] } });
    return Promise.reject(new Error('unexpected url'));
  });
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        <AppThemeProvider>
          <DoctorPatientHistoryPage />
        </AppThemeProvider>
      </QueryClientProvider>
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

  it('renders the patient header and the summary tab by default', async () => {
    searchParamsMock.get.mockReturnValue('10');
    mockDataLoaded();
    renderPage();

    await waitFor(() => {
      expect(screen.getAllByText('Maria Garcia').length).toBeGreaterThan(0);
    });
    expect(screen.getByText('Resumen')).toBeInTheDocument();
    expect(screen.getByText('Registros clínicos')).toBeInTheDocument();
    expect(screen.getByText('Citas')).toBeInTheDocument();
  });

  it('switches to the history tab and lists clinical records + medical history', async () => {
    searchParamsMock.get.mockReturnValue('10');
    mockDataLoaded();
    renderPage();

    await waitFor(() => {
      expect(screen.getAllByText('Maria Garcia').length).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getByText('Historial'));
    await waitFor(() => {
      expect(screen.getByText('Migraña')).toBeInTheDocument();
    });
    expect(screen.getByText('Hipertensión')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Migraña'));
    await waitFor(() => {
      expect(screen.getByText('Dolor de cabeza')).toBeInTheDocument();
    });
    expect(screen.getByText('Cefalea recurrente')).toBeInTheDocument();
    expect(screen.getByText('Reposo')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Volver a la lista'));
    expect(screen.queryByText('Dolor de cabeza')).not.toBeInTheDocument();
  });

  it('shows patient bookings in the citas tab', async () => {
    searchParamsMock.get.mockReturnValue('10');
    mockDataLoaded();
    renderPage();

    await waitFor(() => {
      expect(screen.getAllByText('Maria Garcia').length).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getByRole('tab', { name: /Citas/ }));
    await waitFor(() => {
      expect(screen.getByText('10:00')).toBeInTheDocument();
    });
  });

  it('shows prescriptions in the recetas tab', async () => {
    searchParamsMock.get.mockReturnValue('10');
    mockDataLoaded();
    renderPage();

    await waitFor(() => {
      expect(screen.getAllByText('Maria Garcia').length).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getByRole('tab', { name: /Recetas/ }));
    await waitFor(() => {
      expect(screen.getByText('Ibuprofeno')).toBeInTheDocument();
    });
  });

  it('switches to the lab tab and lists lab requests', async () => {
    searchParamsMock.get.mockReturnValue('10');
    mockDataLoaded();
    renderPage();

    await waitFor(() => {
      expect(screen.getAllByText('Maria Garcia').length).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getByText(/Laboratorio/));
    await waitFor(() => {
      expect(screen.getByText('Hemograma')).toBeInTheDocument();
    });
    expect(screen.getByText(/Prioridad: normal/)).toBeInTheDocument();
  });
});
