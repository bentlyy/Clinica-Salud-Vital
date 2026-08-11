import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AppThemeProvider } from '@/shared/providers/ThemeProvider';
import DoctorLabResultsPage from '@/modules/doctors/pages/DoctorLabResultsPage';

// --- Hoisted mocks ---

const mockNavigate = vi.hoisted(() => vi.fn());

const labServiceMock = vi.hoisted(() => ({
  getLabRequests: vi.fn(),
  getLabRequestById: vi.fn(),
  createLabRequest: vi.fn(),
  getLabTests: vi.fn(),
}));

const clinicalRecordServiceMock = vi.hoisted(() => ({
  list: vi.fn(),
}));

const downloadLabOrderPdfMock = vi.hoisted(() => vi.fn());
const toastMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('@/modules/laboratory/services/lab.service', () => ({
  getLabRequests: labServiceMock.getLabRequests,
  getLabRequestById: labServiceMock.getLabRequestById,
  createLabRequest: labServiceMock.createLabRequest,
  getLabTests: labServiceMock.getLabTests,
}));

vi.mock('@/modules/clinical-records/services/clinical-record.service', () => ({
  clinicalRecordService: clinicalRecordServiceMock,
}));

vi.mock('@/shared/utils/pdf', () => ({
  downloadLabOrderPdf: downloadLabOrderPdfMock,
}));

vi.mock('react-hot-toast', () => ({ default: toastMock }));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'doctor_lab_results:title': 'Solicitudes de laboratorio',
        'doctor_lab_results:subtitle': 'Gestiona exámenes y resultados',
        'doctor_lab_results:newRequest': 'Nueva solicitud',
        'doctor_lab_results:loadingRequests': 'Cargando solicitudes...',
        'doctor_lab_results:loadingDetail': 'Cargando detalle...',
        'doctor_lab_results:emptyTitle': 'Sin solicitudes',
        'doctor_lab_results:emptyDesc': 'No hay solicitudes de laboratorio.',
        'doctor_lab_results:colRequest': 'Solicitud',
        'doctor_lab_results:colPatient': 'Paciente',
        'doctor_lab_results:colDoctor': 'Doctor',
        'doctor_lab_results:colDate': 'Fecha',
        'doctor_lab_results:colStatus': 'Estado',
        'doctor_lab_results:colActions': 'Acciones',
        'doctor_lab_results:history': 'Historial',
        'doctor_lab_results:notes': 'Notas',
        'doctor_lab_results:close': 'Cerrar',
        'doctor_lab_results:newRequestTitle': 'Nueva solicitud de exámenes',
        'doctor_lab_results:patient': 'Paciente',
        'doctor_lab_results:notesLabel': 'Notas',
        'doctor_lab_results:exams': 'Exámenes',
        'doctor_lab_results:exam': 'Examen',
        'doctor_lab_results:addExam': 'Agregar examen',
        'doctor_lab_results:cancel': 'Cancelar',
        'doctor_lab_results:createRequest': 'Crear solicitud',
        'doctor_lab_results:creating': 'Creando...',
        'doctor_lab_results:selectPatientAndExam': 'Selecciona paciente y examen',
        'doctor_lab_results:requestCreated': 'Solicitud creada',
        'doctor_lab_results:errorCreate': 'Error al crear',
        'doctor_lab_results:errorDetail': 'Error al cargar detalle',
        'doctor_lab_results:errorLoad': 'Error al cargar solicitudes',
        'lab:statusLabels.pending': 'Pendiente',
        'lab:statusLabels.completed': 'Completado',
        'lab:statusLabels.processing': 'En proceso',
      };
      return translations[key] ?? key;
    },
    i18n: { language: 'es' },
  }),
}));

const requestData = {
  id: 1,
  request_number: 'LAB-001',
  patient_id: 10,
  doctor_id: 5,
  patient_name: 'Maria Garcia',
  doctor_name: 'Dr. Perez',
  status: 'pending',
  created_at: '2026-08-01T10:00:00Z',
  items: [{ id: 1, lab_test_id: 1, test_name: 'Hemograma' }],
};

function mockInitialLoad({ requests = [] as typeof requestData[] } = {}) {
  labServiceMock.getLabRequests.mockResolvedValue({ data: requests });
  labServiceMock.getLabTests.mockResolvedValue([{ id: 1, name: 'Hemograma' }]);
  clinicalRecordServiceMock.list.mockResolvedValue({
    data: [{ patient_id: 10, patient_name: 'Maria Garcia', patient_email: 'maria@x.cl' }],
  });
}

function renderPage() {
  return render(
    <MemoryRouter>
      <AppThemeProvider>
        <DoctorLabResultsPage />
      </AppThemeProvider>
    </MemoryRouter>,
  );
}

describe('DoctorLabResultsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows the loading state while fetching', () => {
    labServiceMock.getLabRequests.mockReturnValue(new Promise(() => {}));
    labServiceMock.getLabTests.mockReturnValue(new Promise(() => {}));
    clinicalRecordServiceMock.list.mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.getByText('Cargando solicitudes...')).toBeInTheDocument();
  });

  it('renders the requests table with data', async () => {
    mockInitialLoad({ requests: [requestData] });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Maria Garcia')).toBeInTheDocument();
    });
    expect(screen.getByText('Hemograma')).toBeInTheDocument();
    expect(screen.getByText('Pendiente')).toBeInTheDocument();
  });

  it('shows the empty state when there are no requests', async () => {
    mockInitialLoad();
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Sin solicitudes')).toBeInTheDocument();
    });
    expect(screen.getByText('No hay solicitudes de laboratorio.')).toBeInTheDocument();
  });

  it('opens the new request dialog and validates required fields', async () => {
    mockInitialLoad();
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Sin solicitudes')).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByText('Nueva solicitud')[0]);
    expect(screen.getByText('Nueva solicitud de exámenes')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Crear solicitud' }));
    await waitFor(() => {
      expect(toastMock.error).toHaveBeenCalledWith('Selecciona paciente y examen');
    });
  });

  it('creates a request when patient and exam are selected', async () => {
    mockInitialLoad();
    labServiceMock.createLabRequest.mockResolvedValue({ data: { id: 2 } });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Sin solicitudes')).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByText('Nueva solicitud')[0]);

    // Select the patient
    fireEvent.mouseDown(screen.getAllByRole('combobox')[0]);
    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Maria Garcia' })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('option', { name: 'Maria Garcia' }));

    // Add an exam and select it
    fireEvent.click(screen.getByText('Agregar examen'));
    await waitFor(() => {
      expect(screen.getAllByRole('combobox').length).toBe(2);
    });
    fireEvent.mouseDown(screen.getAllByRole('combobox')[1]);
    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Hemograma' })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('option', { name: 'Hemograma' }));

    fireEvent.click(screen.getByRole('button', { name: 'Crear solicitud' }));

    await waitFor(() => {
      expect(labServiceMock.createLabRequest).toHaveBeenCalledWith({
        patient_id: 10,
        notes: undefined,
        test_ids: [1],
      });
    });
    expect(toastMock.success).toHaveBeenCalledWith('Solicitud creada');
  });

  it('opens the detail dialog with request items', async () => {
    mockInitialLoad({ requests: [requestData] });
    labServiceMock.getLabRequestById.mockResolvedValue({ ...requestData, items: [{ id: 1, lab_test_id: 1, test_name: 'Hemograma', result_value: 'Normal', reference_range: '0-10', result_notes: 'Sin novedad' }] });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Maria Garcia')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('VisibilityIcon'));
    await waitFor(() => {
      expect(screen.getByText(/Solicitud #1/)).toBeInTheDocument();
    });
    expect(screen.getAllByText('Hemograma').length).toBeGreaterThan(0);
  });
});
