import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AppThemeProvider } from '@/shared/providers/ThemeProvider';
import MyMedicalHistoryDetailPage from '@/modules/medical-history/pages/MyMedicalHistoryDetailPage';
import type { ClinicalRecord } from '@/modules/clinical-records/types/clinical-record.types';
import type { LabRequest } from '@/modules/laboratory/types/lab.types';

const apiClient = vi.hoisted(() => ({ get: vi.fn() }));
const navigateMock = vi.hoisted(() => vi.fn());

vi.mock('@/shared/services/api-client', () => ({ apiClient }));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useParams: () => ({ id: '7' }), useNavigate: () => navigateMock };
});

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        'medical_history_detail:title': 'Detalle del Historial',
        'medical_history_detail:doctorLabel': 'Dr. {{name}}',
        'medical_history_detail:unknownDoctor': 'Desconocido',
        'medical_history_detail:back': 'Volver',
        'medical_history_detail:errorLoading': 'Error al cargar',
        'medical_history_detail:notFound': 'Registro no encontrado',
        'medical_history_detail:chiefComplaint': 'Motivo de consulta',
        'medical_history_detail:anamnesis': 'Anamnesis',
        'medical_history_detail:vitalSigns': 'Signos vitales',
        'medical_history_detail:physicalExam': 'Examen físico',
        'medical_history_detail:diagnosis': 'Diagnóstico',
        'medical_history_detail:cie10Codes': 'Códigos CIE-10',
        'medical_history_detail:treatmentPlan': 'Plan de tratamiento',
        'medical_history_detail:notes': 'Notas',
        'medical_history_detail:labResultsTitle': 'Resultados de laboratorio',
        'medical_history_detail:show': 'Mostrar ({{count}})',
        'medical_history_detail:hide': 'Ocultar',
        'medical_history_detail:pending': 'Pendiente',
        'medical_history_detail:noLabResults': 'No hay resultados de laboratorio',
      };
      const value = translations[key] ?? key;
      if (opts && value.includes('{{')) {
        return value.replace(/\{\{(\w+)\}\}/g, (_, name: string) => String(opts[name]));
      }
      return value;
    },
    i18n: { language: 'es' },
  }),
}));

const record: ClinicalRecord = {
  id: 7,
  tenant_id: 1,
  patient_id: 10,
  doctor_id: 5,
  chief_complaint: 'Dolor de cabeza',
  anamnesis: 'Paciente refiere cefalea',
  diagnosis: 'Migraña',
  treatment_plan: 'Reposo y analgésicos',
  notes: 'Control en 7 días',
  vital_signs: { blood_pressure: '120/80', temperature: '36.5' },
  patient_name: 'Maria Garcia',
  doctor_name: 'Dr. Perez',
  created_at: '2026-08-01T10:00:00Z',
  updated_at: '2026-08-01T10:00:00Z',
};

const labRequest: LabRequest = {
  id: 1,
  request_number: 'LAB-001',
  patient_id: 10,
  doctor_id: 5,
  status: 'completed',
  items: [{ id: 1, lab_test_id: 1, test_name: 'Hemograma', result_value: 'Normal' }],
  created_at: '2026-08-01T10:00:00Z',
};

function mockApiWithLabs(labRequests: LabRequest[]) {
  apiClient.get.mockImplementation((url: string) => {
    if (url === '/clinical-records/7') return Promise.resolve({ data: record });
    if (url === '/laboratory') return Promise.resolve({ data: { data: labRequests, total: labRequests.length } });
    return Promise.reject(new Error(`Unexpected URL: ${url}`));
  });
}

function renderPage() {
  return render(
    <MemoryRouter>
      <AppThemeProvider>
        <MyMedicalHistoryDetailPage />
      </AppThemeProvider>
    </MemoryRouter>,
  );
}

describe('MyMedicalHistoryDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    navigateMock.mockClear();
  });

  it('shows the loading state while loading', () => {
    apiClient.get.mockReturnValue(new Promise(() => undefined));
    renderPage();
    expect(document.querySelectorAll('.MuiCircularProgress-root').length).toBeGreaterThan(0);
  });

  it('shows the error alert when the record fails to load', async () => {
    apiClient.get.mockRejectedValue(new Error('boom'));
    renderPage();
    expect(await screen.findByText('Error al cargar')).toBeInTheDocument();
  });

  it('renders record sections with data', async () => {
    mockApiWithLabs([labRequest]);
    renderPage();

    expect(await screen.findByText('Detalle del Historial')).toBeInTheDocument();
    expect(screen.getByText(/Dolor de cabeza/)).toBeInTheDocument();
    expect(screen.getByText(/Paciente refiere cefalea/)).toBeInTheDocument();
    expect(screen.getByText(/Migraña/)).toBeInTheDocument();
    expect(screen.getByText(/Reposo y analgésicos/)).toBeInTheDocument();
    expect(screen.getByText(/Control en 7 días/)).toBeInTheDocument();
  });

  it('shows and hides lab results', async () => {
    mockApiWithLabs([labRequest]);
    renderPage();

    expect(await screen.findByText('Mostrar (1)')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Mostrar (1)'));

    expect(screen.getByText('LAB-001')).toBeInTheDocument();
    expect(screen.getByText(/Hemograma/)).toBeInTheDocument();

    fireEvent.click(screen.getByText('Ocultar'));
    expect(screen.queryByText('LAB-001')).not.toBeInTheDocument();
  });

  it('shows the no lab results message', async () => {
    mockApiWithLabs([]);
    renderPage();
    expect(await screen.findByText('No hay resultados de laboratorio')).toBeInTheDocument();
  });

  it('navigates back when the back button is clicked', async () => {
    mockApiWithLabs([]);
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Volver' }));
    expect(navigateMock).toHaveBeenCalledWith('/medical-history');
  });
});
