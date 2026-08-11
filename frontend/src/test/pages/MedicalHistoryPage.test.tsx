import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppThemeProvider } from '@/shared/providers/ThemeProvider';
import MedicalHistoryPage from '@/modules/medical-history/pages/MedicalHistoryPage';
import type { MedicalHistoryEntry } from '@/modules/medical-history/types/medical-history.types';

const listMock = vi.hoisted(() => ({
  data: undefined as { data: MedicalHistoryEntry[]; total: number } | undefined,
  isLoading: true,
  error: null as Error | null,
  refetch: vi.fn(),
}));

const mutationsMock = vi.hoisted(() => ({
  create: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  update: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
}));

const patientServiceMock = vi.hoisted(() => ({
  list: vi.fn().mockResolvedValue({ data: [] }),
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
      title: 'Historial Médico',
      patient_entries: '{{count}} registros',
      total_entries: '{{count}} registros',
      new_entry: 'Nueva Entrada',
      create_entry: 'Crear Entrada',
      loading: 'Cargando historial...',
      search_placeholder: 'Buscar condiciones...',
      all_statuses: 'Todos',
      status_active: 'Activo',
      status_resolved: 'Resuelto',
      status_chronic: 'Crónico',
      status_family: 'Familiar',
      no_entries: 'Sin registros',
      no_entries_message: 'No hay entradas en el historial',
      patient_label: 'Paciente',
      onset_date_label: 'Inicio',
      condition_label: 'Condición',
      condition_required: 'La condición es requerida',
      onset_date_label_optional: 'Fecha de inicio',
      status_label: 'Estado',
      notes_label: 'Notas',
      notes_placeholder: 'Notas adicionales...',
      cancel: 'Cancelar',
      saving: 'Guardando...',
      update: 'Actualizar',
      create: 'Crear',
      new_entry_title: 'Nueva Entrada',
      edit_entry: 'Editar Entrada',
      search_patient: 'Buscar paciente...',
      select_patient: 'Selecciona un paciente',
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

vi.mock('@/modules/medical-history/hooks/useMedicalHistory', () => ({
  useMedicalHistory: () => listMock,
  useCreateMedicalHistory: () => mutationsMock.create(),
  useUpdateMedicalHistory: () => mutationsMock.update(),
}));

vi.mock('@/modules/patients/services/patient.service', () => ({ patientService: patientServiceMock }));

const entry: MedicalHistoryEntry = {
  id: 1,
  tenant_id: 't1',
  patient_id: 10,
  patient_name: 'Maria Garcia',
  condition: 'Hipertensión',
  onset_date: '2025-01-01',
  status: 'active',
  notes: 'Control mensual',
  created_at: '2026-08-01T10:00:00Z',
};

function renderPage() {
  return render(
    <AppThemeProvider>
      <MedicalHistoryPage />
    </AppThemeProvider>,
  );
}

describe('MedicalHistoryPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listMock.isLoading = true;
    listMock.data = undefined;
    listMock.error = null;
    listMock.refetch = vi.fn();
  });

  it('shows the loading state', () => {
    renderPage();
    expect(screen.getByText('Cargando historial...')).toBeInTheDocument();
  });

  it('shows the error state', () => {
    listMock.isLoading = false;
    listMock.error = new Error('Network error');
    renderPage();
    expect(screen.getByText(/Network error/)).toBeInTheDocument();
  });

  it('renders empty state and status filter chips', () => {
    listMock.isLoading = false;
    listMock.data = { data: [], total: 0 };
    renderPage();
    expect(screen.getByText('Sin registros')).toBeInTheDocument();
    expect(screen.getByText('Todos')).toBeInTheDocument();
    expect(screen.getByText('Activo')).toBeInTheDocument();
    expect(screen.getByText('Crónico')).toBeInTheDocument();
  });

  it('renders timeline entries with status chips', () => {
    listMock.isLoading = false;
    listMock.data = { data: [entry], total: 1 };
    renderPage();
    expect(screen.getByText('Hipertensión')).toBeInTheDocument();
    // 'Activo' aparece en el chip de filtro y en el chip de estado de la entrada
    expect(screen.getAllByText('Activo').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/Maria Garcia/)).toBeInTheDocument();
    expect(screen.getByText('Control mensual')).toBeInTheDocument();
  });

  it('opens the create dialog and validates required fields', async () => {
    listMock.isLoading = false;
    listMock.data = { data: [], total: 0 };
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: /Nueva Entrada/i }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Nueva Entrada')).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Crear' }));
    expect(await screen.findByText('La condición es requerida')).toBeInTheDocument();
    expect(await screen.findByText('Selecciona un paciente')).toBeInTheDocument();
  });

  it('opens the edit dialog pre-filled and submits the update', async () => {
    const mutate = vi.fn((_id, opts) => opts?.onSuccess?.());
    mutationsMock.update.mockReturnValue({ mutate, isPending: false });
    listMock.isLoading = false;
    listMock.data = { data: [entry], total: 1 };
    renderPage();

    fireEvent.click(screen.getByTestId('EditIcon'));
    expect(screen.getByText('Editar Entrada')).toBeInTheDocument();
    expect(screen.getByLabelText(/Condición/i)).toHaveValue('Hipertensión');

    fireEvent.click(screen.getByRole('button', { name: 'Actualizar' }));
    await vi.waitFor(() => expect(mutate).toHaveBeenCalled());
    const args = mutate.mock.calls[0];
    expect(args[0]).toEqual({
      id: 1,
      input: expect.objectContaining({ condition: 'Hipertensión', status: 'active', patient_id: 10 }),
    });
  });

  it('closes the dialog via the cancel button', async () => {
    listMock.isLoading = false;
    listMock.data = { data: [], total: 0 };
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: /Nueva Entrada/i }));
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancelar' }));
    // The MUI Dialog unmounts after its exit transition (~195ms); under a full
    // parallel suite the timers can be delayed, so use a generous timeout.
    await vi.waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument(), { timeout: 10000 });
  });
});
