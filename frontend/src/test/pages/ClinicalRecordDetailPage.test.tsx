import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AppThemeProvider } from '@/shared/providers/ThemeProvider';
import ClinicalRecordDetailPage from '@/modules/clinical-records/pages/ClinicalRecordDetailPage';
import type { ClinicalRecord } from '@/modules/clinical-records/types/clinical-record.types';

const detailMock = vi.hoisted(() => ({
  data: null as ClinicalRecord | null | undefined,
  isLoading: true,
  error: null as Error | null,
  refetch: vi.fn(),
}));

const navigateMock = vi.hoisted(() => vi.fn());

vi.mock('framer-motion', () => {
  const PassThrough = (props: { children?: React.ReactNode }) => props.children ?? null;
  return {
    motion: new Proxy(PassThrough, {
      apply: () => PassThrough,
      get: () => PassThrough,
    }),
  };
});

vi.mock('@/i18n/i18n', () => ({
  default: { language: 'es', on: vi.fn() },
}));

vi.mock('@/shared/utils/localeUtils', async () => {
  const actual = await vi.importActual<typeof import('@/shared/utils/localeUtils')>('@/shared/utils/localeUtils');
  return { ...actual, getDateFnsLocale: vi.fn().mockResolvedValue(undefined) };
});

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useParams: () => ({ id: '5' }), useNavigate: () => navigateMock };
});

vi.mock('react-i18next', () => ({
  useTranslation: () => {
    const translations: Record<string, string> = {
      loading_record: 'Cargando registro...',
      record_title: 'Registro #{{id}}',
      patient_fallback: 'Paciente #{{id}}',
      doctor_fallback: 'Dr. #{{id}}',
      back_button: 'Volver',
      edit_button: 'Editar',
      print_button: 'Imprimir',
      label_patient: 'Paciente',
      label_doctor: 'Médico',
      label_created_at: 'Fecha',
      section_vitals: 'Signos vitales',
      section_chief_complaint: 'Motivo de consulta',
      section_diagnosis: 'Diagnóstico',
      section_treatment: 'Tratamiento',
      section_additional_notes: 'Notas adicionales',
      section_attachments: 'Adjuntos',
      error_default_title: 'Algo salió mal',
      error_default_message: 'Intenta nuevamente',
      error_not_found_title: 'No encontrado',
      error_not_found_message: 'El recurso no existe',
      retry: 'Reintentar',
    };
    return { t: (key: string, opts?: string | Record<string, unknown>) => {
      let value = translations[key] ?? (typeof opts === 'string' ? opts : key);
      if (opts && typeof opts === 'object') return value.replace(/\{\{(\w+)\}\}/g, (_, name: string) => String(opts[name]));
      return value;
    }, i18n: { language: 'es' } };
  },
}));

vi.mock('@/shared/providers/AuthProvider', () => ({
  useAuth: () => ({
    user: { id: 1, email: 'admin@clinic.com', role: 'admin', name: 'Admin', tenant_id: 1 },
    isAuthenticated: true,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
    logoutAll: vi.fn(),
    hasPermission: vi.fn(() => true),
  }),
}));

vi.mock('@/modules/clinical-records/hooks/useClinicalRecords', () => ({
  useClinicalRecordDetail: () => detailMock,
}));

vi.mock('@/modules/attachments/hooks/useAttachments', () => ({
  useAttachments: () => ({
    data: [{ id: 1, original_name: 'informe.pdf', size_bytes: 10 }],
    isLoading: false,
  }),
  useUploadAttachment: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteAttachment: () => ({ mutate: vi.fn(), isPending: false }),
}));

const record: ClinicalRecord = {
  id: 5,
  tenant_id: 1,
  patient_id: 10,
  doctor_id: 3,
  chief_complaint: 'Dolor abdominal',
  diagnosis: 'Gastritis',
  treatment: 'Omeprazol 20mg',
  notes: 'Seguimiento en 2 semanas',
  vitals: { temperature: '36.5', blood_pressure: '120/80' },
  attachments: ['informe.pdf'],
  patient_name: 'Maria Garcia',
  doctor_name: 'Dr. Perez',
  created_at: '2026-08-01T10:00:00Z',
  updated_at: '2026-08-01T10:00:00Z',
};

function renderPage() {
  return render(
    <MemoryRouter>
      <AppThemeProvider>
        <ClinicalRecordDetailPage />
      </AppThemeProvider>
    </MemoryRouter>,
  );
}

describe('ClinicalRecordDetailPage', () => {
  let printSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    navigateMock.mockClear();
    detailMock.isLoading = true;
    detailMock.data = undefined;
    detailMock.error = null;
    detailMock.refetch = vi.fn();
    printSpy = vi.spyOn(window, 'print').mockImplementation(() => undefined);
  });

  afterEach(() => {
    printSpy.mockRestore();
  });

  it('shows the loading state', () => {
    renderPage();
    expect(screen.getByText('Cargando registro...')).toBeInTheDocument();
  });

  it('shows the error state', () => {
    detailMock.isLoading = false;
    detailMock.error = new Error('Network error');
    renderPage();
    expect(screen.getByText(/Network error/)).toBeInTheDocument();
  });

  it('shows the not found state when there is no record', () => {
    detailMock.isLoading = false;
    detailMock.data = null;
    renderPage();
    expect(screen.getByText('No encontrado')).toBeInTheDocument();
  });

  it('renders record info, vitals and clinical sections', () => {
    detailMock.isLoading = false;
    detailMock.data = record;
    renderPage();

    expect(screen.getByText('Registro #5')).toBeInTheDocument();
    expect(screen.getAllByText('Maria Garcia').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Dr. Perez').length).toBeGreaterThan(0);
    expect(screen.getByText(/Dolor abdominal/)).toBeInTheDocument();
    expect(screen.getByText(/Gastritis/)).toBeInTheDocument();
    expect(screen.getByText(/Omeprazol 20mg/)).toBeInTheDocument();
    expect(screen.getByText(/Seguimiento en 2 semanas/)).toBeInTheDocument();
    expect(screen.getByText('Temperatura')).toBeInTheDocument();
    expect(screen.getByText('36.5')).toBeInTheDocument();
    expect(screen.getByText('informe.pdf')).toBeInTheDocument();
  });

  it('navigates back when the back button is clicked', () => {
    detailMock.isLoading = false;
    detailMock.data = record;
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Volver' }));
    expect(navigateMock).toHaveBeenCalledWith(-1);
  });

  it('navigates to the edit page when the edit button is clicked', () => {
    detailMock.isLoading = false;
    detailMock.data = record;
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /Editar/ }));
    expect(navigateMock).toHaveBeenCalledWith('/clinical-records/5/edit');
  });

  it('calls window.print when the print button is clicked', () => {
    detailMock.isLoading = false;
    detailMock.data = record;
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Imprimir' }));
    expect(printSpy).toHaveBeenCalled();
  });
});
