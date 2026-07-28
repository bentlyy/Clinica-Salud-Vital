import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AppThemeProvider } from '@/shared/providers/ThemeProvider';
import DoctorsPage from '@/modules/doctors/pages/DoctorsPage';

// --- Hoisted mock values ---

const mockHookReturn = vi.hoisted(() => ({
  data: undefined as { data: Record<string, unknown>[]; total: number } | undefined,
  isLoading: true,
  error: null as Error | null,
  refetch: vi.fn(),
}));

const mockUser = vi.hoisted(() => ({
  id: 1,
  email: 'admin@clinic.com',
  role: 'admin',
  name: 'Admin User',
  tenant_id: 1,
}));

// --- Mocks ---

vi.mock('framer-motion', () => {
  const PassThrough = (props: { children?: React.ReactNode }) => props.children ?? null;
  return {
    motion: new Proxy(PassThrough, {
      apply: () => PassThrough,
      get: () => PassThrough,
    }),
  };
});

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        listTitle: 'Doctores',
        resultsCount: '0 doctores registrados',
        loading_doctors: 'Cargando doctores...',
        searchPlaceholderFull: 'Buscar por nombre, email, especialidad...',
        inviteDoctor: 'Invitar Doctor',
        newDoctorButton: 'Nuevo Doctor',
        noDoctorsTitle: 'Sin doctores',
        noDoctorsMessage: 'No hay doctores registrados en el sistema',
        name: 'Nombre',
        emailLabel: 'Email',
        specialtyLabel: 'Especialidad',
        licenseNumber: 'Licencia',
        actionsLabel: 'Acciones',
        'editDoctorLabel': 'Editar doctor',
        doctorSchedule: 'Horario del doctor',
        totalDoctors: 'doctores en total',
        page_of: 'Pagina 1 de 1',
        rows_per_page: 'Filas por pagina',
        labelDisplayedRows: '1-12 de 12',
        labelDisplayedRowsMore: 'Mas resultados',
      };
      return translations[key] ?? key;
    },
    i18n: { language: 'es' },
  }),
}));

vi.mock('@/shared/providers/AuthProvider', () => ({
  useAuth: () => ({
    user: mockUser,
    isAuthenticated: true,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
    logoutAll: vi.fn(),
    hasPermission: vi.fn(() => true),
  }),
}));

vi.mock('@/modules/doctors/hooks/useDoctors', () => ({
  useDoctorList: () => mockHookReturn,
  useCreateDoctor: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateDoctor: () => ({ mutate: vi.fn(), isPending: false }),
  useInviteDoctor: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('@/modules/doctors/components/DoctorCard', () => ({
  DoctorCard: ({ doctor }: { doctor: { name: string } }) => (
    <div data-testid="doctor-card">{doctor.name}</div>
  ),
}));

vi.mock('@/modules/doctors/components/DoctorFormDialog', () => ({
  DoctorFormDialog: () => null,
}));

vi.mock('@/modules/doctors/components/InviteDoctorDialog', () => ({
  InviteDoctorDialog: () => null,
}));

// --- Render helper ---

function renderPage() {
  return render(
    <MemoryRouter>
      <AppThemeProvider>
        <DoctorsPage />
      </AppThemeProvider>
    </MemoryRouter>,
  );
}

// --- Tests ---

describe('DoctorsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHookReturn.isLoading = true;
    mockHookReturn.data = undefined;
    mockHookReturn.error = null;
    mockHookReturn.refetch = vi.fn();
  });

  it('shows loading state while data is being fetched', () => {
    mockHookReturn.isLoading = true;
    renderPage();
    expect(screen.getByText('Cargando doctores...')).toBeInTheDocument();
  });

  it('renders the page title', () => {
    mockHookReturn.isLoading = false;
    mockHookReturn.data = { data: [], total: 0 };
    renderPage();
    expect(screen.getByText('Doctores')).toBeInTheDocument();
  });

  it('renders doctor cards when data is loaded', () => {
    mockHookReturn.isLoading = false;
    mockHookReturn.data = {
      data: [
        {
          id: 1,
          name: 'Juan Perez',
          email: 'juan@clinic.com',
          specialty: 'Cardiologia',
          license_number: '12345',
          avatar_url: null,
          user_id: 1,
        },
        {
          id: 2,
          name: 'Ana Martinez',
          email: 'ana@clinic.com',
          specialty: 'Pediatria',
          license_number: '67890',
          avatar_url: null,
          user_id: 2,
        },
      ],
      total: 2,
    };
    renderPage();
    const cards = screen.getAllByTestId('doctor-card');
    expect(cards).toHaveLength(2);
    expect(screen.getByText('Juan Perez')).toBeInTheDocument();
    expect(screen.getByText('Ana Martinez')).toBeInTheDocument();
  });

  it('displays the search input field', () => {
    mockHookReturn.isLoading = false;
    mockHookReturn.data = { data: [], total: 0 };
    renderPage();
    expect(
      screen.getByPlaceholderText('Buscar por nombre, email, especialidad...'),
    ).toBeInTheDocument();
  });

  it('shows empty state when there are no doctors', () => {
    mockHookReturn.isLoading = false;
    mockHookReturn.data = { data: [], total: 0 };
    renderPage();
    expect(screen.getByText('Sin doctores')).toBeInTheDocument();
    expect(
      screen.getByText('No hay doctores registrados en el sistema'),
    ).toBeInTheDocument();
  });

  it('displays "Nuevo Doctor" buttons when user has permission', () => {
    mockHookReturn.isLoading = false;
    mockHookReturn.data = { data: [], total: 0 };
    renderPage();
    const buttons = screen.getAllByText('Nuevo Doctor');
    expect(buttons.length).toBeGreaterThanOrEqual(1);
  });

  it('does not render doctor cards while loading', () => {
    mockHookReturn.isLoading = true;
    renderPage();
    expect(screen.queryByTestId('doctor-card')).not.toBeInTheDocument();
    expect(screen.queryByText('Nuevo Doctor')).not.toBeInTheDocument();
  });
});
