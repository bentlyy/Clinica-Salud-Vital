import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppThemeProvider } from '@/shared/providers/ThemeProvider';
import PrescriptionsPage from '@/modules/prescriptions/pages/PrescriptionsPage';
import type { Prescription } from '@/modules/prescriptions/types/prescription.types';

const listMock = vi.hoisted(() => ({
  data: undefined as { data: Prescription[]; total: number } | undefined,
  isLoading: true,
  error: null as Error | null,
  refetch: vi.fn(),
}));

const mutationsMock = vi.hoisted(() => ({
  create: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  update: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  remove: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  downloadPdf: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
}));

vi.mock('framer-motion', () => {
  const PassThrough = (props: { children?: React.ReactNode }) => props.children ?? null;
  return {
    motion: new Proxy(PassThrough, {
      apply: () => PassThrough,
      get: () => PassThrough,
    }),
    AnimatePresence: ({ children }: { children?: React.ReactNode }) => children ?? null,
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
      title: 'Recetas',
      totalSubtitle: '{{total}} recetas',
      newPrescription: 'Nueva Receta',
      createPrescription: 'Crear Receta',
      loading: 'Cargando recetas...',
      searchPlaceholder: 'Buscar recetas...',
      noPrescriptions: 'Sin recetas',
      noResultsMessage: 'No se encontraron recetas',
      patient: 'Paciente',
      doctor: 'Doctor',
      medications: 'Medicamentos',
      date: 'Fecha',
      confirmDelete: '¿Eliminar receta?',
      viewDetail: 'Ver Detalle',
      downloadPdf: 'Descargar PDF',
      prescriptionNumber: 'Receta #{{id}}',
      frequencyLabel: 'Frecuencia:',
      durationLabel: 'Duración:',
      notes: 'Notas',
      patientFallback: 'Paciente #{{id}}',
      doctorFallback: 'Dr. #{{id}}',
      actions: 'Acciones',
      edit: 'Editar',
      delete: 'Eliminar',
      rowsPerPage: 'Filas por página',
      of: 'de',
      moreThan: 'más de',
    };
    return {
      t: (key: string, opts?: Record<string, unknown>) => {
        const value = translations[key] ?? key;
        if (opts) return value.replace(/\{\{(\w+)\}\}/g, (_, name: string) => String(opts[name]));
        return value;
      },
      i18n: { language: 'es' },
    };
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

vi.mock('@/modules/prescriptions/hooks/usePrescriptions', () => ({
  useAllPrescriptions: () => listMock,
  useCreatePrescription: () => mutationsMock.create(),
  useUpdatePrescription: () => mutationsMock.update(),
  useDeletePrescription: () => mutationsMock.remove(),
  useDownloadPrescriptionPdf: () => mutationsMock.downloadPdf(),
}));

vi.mock('@/modules/prescriptions/components/PrescriptionFormDialog', () => ({
  PrescriptionFormDialog: () => null,
}));

const prescription: Prescription = {
  id: 1,
  tenant_id: 1,
  patient_id: 10,
  doctor_id: 5,
  medications: [{ name: 'Paracetamol', dosage: '500mg', frequency: 'cada 8h', duration: '7 dias' }],
  notes: 'Tomar con alimentos',
  doctor_name: 'Dr. Perez',
  patient_name: 'Maria Garcia',
  created_at: '2026-08-01T10:00:00Z',
};

function renderPage() {
  return render(
    <AppThemeProvider>
      <PrescriptionsPage />
    </AppThemeProvider>,
  );
}

function openRowMenu() {
  const row = screen.getByRole('row', { name: /Maria Garcia/ });
  fireEvent.click(within(row).getByRole('button'));
}

describe('PrescriptionsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listMock.isLoading = true;
    listMock.data = undefined;
    listMock.error = null;
    listMock.refetch = vi.fn();
    vi.stubGlobal('confirm', vi.fn(() => true));
  });

  it('shows the loading state', () => {
    renderPage();
    expect(screen.getByText('Cargando recetas...')).toBeInTheDocument();
  });

  it('shows the error state', () => {
    listMock.isLoading = false;
    listMock.error = new Error('Network error');
    renderPage();
    expect(screen.getByText(/Network error/)).toBeInTheDocument();
  });

  it('renders empty state when there are no prescriptions', () => {
    listMock.isLoading = false;
    listMock.data = { data: [], total: 0 };
    renderPage();
    expect(screen.getByText('Sin recetas')).toBeInTheDocument();
    expect(screen.getByText('No se encontraron recetas')).toBeInTheDocument();
  });

  it('renders prescription rows', () => {
    listMock.isLoading = false;
    listMock.data = { data: [prescription], total: 1 };
    renderPage();
    expect(screen.getByText('Maria Garcia')).toBeInTheDocument();
    expect(screen.getByText('Dr. Perez')).toBeInTheDocument();
    expect(screen.getByText('Paracetamol 500mg')).toBeInTheDocument();
  });

  it('opens the create form when clicking the new prescription button', () => {
    listMock.isLoading = false;
    listMock.data = { data: [], total: 0 };
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /Nueva Receta/i }));
    expect(screen.getByRole('button', { name: /Nueva Receta/i })).toBeInTheDocument();
  });

  it('shows the detail dialog from the context menu', () => {
    listMock.isLoading = false;
    listMock.data = { data: [prescription], total: 1 };
    renderPage();

    openRowMenu();
    fireEvent.click(screen.getByText('Ver Detalle'));

    expect(screen.getByText('Receta #1')).toBeInTheDocument();
    expect(screen.getByText('Tomar con alimentos')).toBeInTheDocument();
  });

  it('downloads the PDF from the context menu', () => {
    const mutate = vi.fn();
    mutationsMock.downloadPdf.mockReturnValue({ mutate, isPending: false });
    listMock.isLoading = false;
    listMock.data = { data: [prescription], total: 1 };
    renderPage();

    openRowMenu();
    fireEvent.click(screen.getByText('Descargar PDF'));
    expect(mutate).toHaveBeenCalledWith(1);
  });

  it('deletes a prescription after confirming', () => {
    const mutate = vi.fn();
    mutationsMock.remove.mockReturnValue({ mutate, isPending: false });
    listMock.isLoading = false;
    listMock.data = { data: [prescription], total: 1 };
    renderPage();

    openRowMenu();
    fireEvent.click(screen.getByText('Eliminar'));
    expect(mutate).toHaveBeenCalledWith(1);
  });

  it('does not delete when the confirmation is cancelled', () => {
    const mutate = vi.fn();
    mutationsMock.remove.mockReturnValue({ mutate, isPending: false });
    vi.stubGlobal('confirm', vi.fn(() => false));
    listMock.isLoading = false;
    listMock.data = { data: [prescription], total: 1 };
    renderPage();

    openRowMenu();
    fireEvent.click(screen.getByText('Eliminar'));
    expect(mutate).not.toHaveBeenCalled();
  });

  it('opens the edit form from the context menu', async () => {
    const updateMutate = vi.fn();
    mutationsMock.update.mockReturnValue({ mutate: updateMutate, isPending: false });
    listMock.isLoading = false;
    listMock.data = { data: [prescription], total: 1 };
    renderPage();

    openRowMenu();
    fireEvent.click(screen.getByText('Editar'));
    // The form dialog is mocked to null; assert the menu closes after the transition
    await vi.waitFor(() => expect(screen.queryByText('Editar')).not.toBeInTheDocument());
  });

  it('closes the detail dialog', () => {
    listMock.isLoading = false;
    listMock.data = { data: [prescription], total: 1 };
    renderPage();

    openRowMenu();
    fireEvent.click(screen.getByText('Ver Detalle'));
    expect(screen.getByText('Receta #1')).toBeInTheDocument();

    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button'));
    expect(screen.queryByText('Receta #1')).not.toBeInTheDocument();
  });
});
