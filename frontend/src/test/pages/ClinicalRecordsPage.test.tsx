import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppThemeProvider } from '@/shared/providers/ThemeProvider';
import ClinicalRecordsPage from '@/modules/clinical-records/pages/ClinicalRecordsPage';
import type { ClinicalRecord } from '@/modules/clinical-records/types/clinical-record.types';

const listMock = vi.hoisted(() => ({
  data: undefined as { data: ClinicalRecord[]; total: number } | undefined,
  isLoading: true,
  error: null as Error | null,
  refetch: vi.fn(),
}));

const mutationsMock = vi.hoisted(() => ({
  create: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  update: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  remove: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
}));

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

vi.mock('react-i18next', () => ({
  useTranslation: () => {
    const translations: Record<string, string> = {
      loading_records: 'Cargando registros...',
      title: 'Registros Clínicos',
      total_label: '{{count}} registros',
      new_record: 'Nuevo Registro',
      search_placeholder: 'Buscar por paciente o diagnóstico...',
      no_records_title: 'Sin registros',
      no_records_message: 'No hay registros clínicos',
      create_record: 'Crear Registro',
      col_patient: 'Paciente',
      col_doctor: 'Médico',
      col_chief_complaint: 'Motivo de consulta',
      col_diagnosis: 'Diagnóstico',
      col_date: 'Fecha',
      col_actions: 'Acciones',
      patientFallback: 'Paciente #{{id}}',
      doctorFallback: 'Dr. #{{id}}',
      rows_per_page: 'Filas por página',
      labelDisplayedRows: '{{from}}–{{to}} de {{count}}',
      labelDisplayedRowsMore: '{{to}}+',
      view_detail: 'Ver Detalle',
      edit: 'Editar',
      delete: 'Eliminar',
      confirm_delete_title: '¿Eliminar registro?',
      record_id_label: 'Registro #{{id}}',
      field_patient: 'Paciente',
      field_doctor: 'Médico',
      field_date: 'Fecha',
      section_chief_complaint: 'Motivo de consulta',
      section_diagnosis: 'Diagnóstico',
      section_treatment: 'Tratamiento',
      section_vitals: 'Signos vitales',
      section_notes: 'Notas',
      edit_record: 'Editar Registro',
      patient_name: 'Nombre del Paciente',
      patient_name_required: 'El nombre del paciente es requerido',
      patient: 'Paciente',
      select_patient: 'Selecciona un paciente',
      template_optional: 'Plantilla (opcional)',
      select_template: 'Seleccionar plantilla',
      chief_complaint: 'Motivo de consulta',
      chief_complaint_required: 'El motivo de consulta es requerido',
      diagnosis: 'Diagnóstico',
      diagnosis_required: 'El diagnóstico es requerido',
      treatment: 'Tratamiento',
      treatment_required: 'El tratamiento es requerido',
      vital_signs: 'Signos vitales',
      temperature: 'Temperatura',
      blood_pressure: 'Presión Arterial',
      heart_rate: 'Frecuencia Cardíaca',
      weight: 'Peso',
      height: 'Estatura',
      oxygen_saturation: 'Saturación O2',
      additional_notes: 'Notas adicionales',
      notes_placeholder: 'Escribe notas adicionales...',
      saving: 'Guardando...',
      update: 'Actualizar',
      error_default_title: 'Algo salió mal',
      error_default_message: 'Intenta nuevamente',
      retry: 'Reintentar',
      cancel: 'Cancelar',
    };
    return { t: (key: string, opts?: Record<string, unknown>) => {
      const value = translations[key] ?? key;
      if (opts) return value.replace(/\{\{(\w+)\}\}/g, (_, name: string) => String(opts[name]));
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
  useClinicalRecords: () => listMock,
  useCreateClinicalRecord: () => mutationsMock.create(),
  useUpdateClinicalRecord: () => mutationsMock.update(),
  useDeleteClinicalRecord: () => mutationsMock.remove(),
}));

vi.mock('@/modules/clinical-templates/hooks/useClinicalTemplates', () => ({
  useClinicalTemplates: () => ({ data: { data: [] }, isLoading: false }),
}));

const record: ClinicalRecord = {
  id: 5,
  tenant_id: 1,
  patient_id: 10,
  doctor_id: 3,
  chief_complaint: 'Dolor abdominal',
  diagnosis: 'Gastritis',
  treatment_plan: 'Omeprazol 20mg',
  notes: 'Seguimiento en 2 semanas',
  vitals: { temperature: '36.5' },
  patient_name: 'Maria Garcia',
  doctor_name: 'Dr. Perez',
  created_at: '2026-08-01T10:00:00Z',
  updated_at: '2026-08-01T10:00:00Z',
};

function renderPage() {
  return render(
    <AppThemeProvider>
      <ClinicalRecordsPage />
    </AppThemeProvider>,
  );
}

describe('ClinicalRecordsPage', () => {
  let confirmSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    listMock.isLoading = true;
    listMock.data = undefined;
    listMock.error = null;
    listMock.refetch = vi.fn();
    confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  afterEach(() => {
    confirmSpy.mockRestore();
  });

  it('shows the loading state', () => {
    renderPage();
    expect(screen.getByText('Cargando registros...')).toBeInTheDocument();
  });

  it('shows the error state', () => {
    listMock.isLoading = false;
    listMock.error = new Error('Network error');
    renderPage();
    expect(screen.getByText(/Network error/)).toBeInTheDocument();
  });

  it('renders the empty state and opens the form from its action', () => {
    listMock.isLoading = false;
    listMock.data = { data: [], total: 0 };
    renderPage();
    expect(screen.getByText('Sin registros')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Crear Registro' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getAllByText('Nuevo Registro').length).toBeGreaterThan(0);
  });

  it('renders table rows and pagination', () => {
    listMock.isLoading = false;
    listMock.data = { data: [record], total: 1 };
    renderPage();
    expect(screen.getByText('Maria Garcia')).toBeInTheDocument();
    expect(screen.getByText('Dr. Perez')).toBeInTheDocument();
    expect(screen.getByText('Dolor abdominal')).toBeInTheDocument();
    expect(screen.getByText('Gastritis')).toBeInTheDocument();
  });

  it('opens the create dialog from the header button', () => {
    listMock.isLoading = false;
    listMock.data = { data: [record], total: 1 };
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /Nuevo Registro/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('shows the record detail from the row menu', async () => {
    listMock.isLoading = false;
    listMock.data = { data: [record], total: 1 };
    renderPage();

    fireEvent.click(screen.getByTestId('MoreVertIcon'));
    fireEvent.click(await screen.findByText('Ver Detalle'));

    expect(screen.getByText('Registro #5')).toBeInTheDocument();
    expect(screen.getAllByText(/Dolor abdominal/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Omeprazol 20mg/)).toBeInTheDocument();
  });

  it('deletes a record when the confirmation is accepted', async () => {
    const deleteMutate = vi.fn();
    mutationsMock.remove.mockReturnValue({ mutate: deleteMutate, isPending: false });
    listMock.isLoading = false;
    listMock.data = { data: [record], total: 1 };
    renderPage();

    fireEvent.click(screen.getByTestId('MoreVertIcon'));
    fireEvent.click(await screen.findByText('Eliminar'));

    expect(confirmSpy).toHaveBeenCalled();
    expect(deleteMutate).toHaveBeenCalledWith(5);
  });

  it('does not delete when the confirmation is rejected', async () => {
    confirmSpy.mockReturnValue(false);
    const deleteMutate = vi.fn();
    mutationsMock.remove.mockReturnValue({ mutate: deleteMutate, isPending: false });
    listMock.isLoading = false;
    listMock.data = { data: [record], total: 1 };
    renderPage();

    fireEvent.click(screen.getByTestId('MoreVertIcon'));
    fireEvent.click(await screen.findByText('Eliminar'));

    expect(confirmSpy).toHaveBeenCalled();
    expect(deleteMutate).not.toHaveBeenCalled();
  });

  it('opens the edit dialog pre-filled from the row menu', async () => {
    listMock.isLoading = false;
    listMock.data = { data: [record], total: 1 };
    renderPage();

    fireEvent.click(screen.getByTestId('MoreVertIcon'));
    fireEvent.click(await screen.findByText('Editar'));

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Editar Registro')).toBeInTheDocument();
    expect(within(dialog).getByLabelText(/Motivo de consulta/)).toHaveValue('Dolor abdominal');
  });

  it('updates the search box', async () => {
    listMock.isLoading = false;
    listMock.data = { data: [record], total: 1 };
    renderPage();

    const search = screen.getByPlaceholderText('Buscar por paciente o diagnóstico...');
    fireEvent.change(search, { target: { value: 'Gastritis' } });
    await waitFor(() => expect(search).toHaveValue('Gastritis'));
  });
});
