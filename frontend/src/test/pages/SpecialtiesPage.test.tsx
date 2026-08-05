import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AppThemeProvider } from '@/shared/providers/ThemeProvider';
import SpecialtiesPage from '@/modules/specialties/pages/SpecialtiesPage';

const mockHookReturn = vi.hoisted(() => ({
  data: undefined as
    | { data: Record<string, unknown>[]; total: number; totalPages: number }
    | undefined,
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

vi.mock('react-i18next', () => ({
  useTranslation: (ns?: string) => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        title: 'Especialidades',
        subtitle: '0 especialidades registradas',
        newSpecialty: 'Nueva Especialidad',
        searchPlaceholder: 'Buscar especialidades...',
        clinicFilter: 'Filtrar por clínica',
        allClinics: 'Todas las clínicas',
        notFound: 'No se encontraron especialidades',
        emptySearch: 'Ajusta los filtros o intenta con otros términos.',
        emptyNone: 'Crea tu primera especialidad para comenzar.',
        statsSpecialties: 'Especialidades',
        statsDoctors: 'Doctores',
        statsProcedures: 'Procedimientos',
        statsClinics: 'Clínicas',
        editSpecialty: 'Editar Especialidad',
        doctorsCount: '{{count}} doctores',
        deleteTitle: 'Eliminar Especialidad',
        confirmDeleteMessage: '¿Eliminar <strong>{{name}}</strong>?',
        loading: 'Cargando especialidades...',
        saving: 'Guardando...',
        updating: 'Actualizar',
        deleting: 'Eliminando...',
        icon: 'Icono',
        iconHelper: 'Emoji o símbolo (máx. 4 caracteres)',
        departmentLabel: 'Departamento',
        departmentHelper: 'Ej: Cardiología',
        colorLabel: 'Color',
        colorHelper: 'Color de acento',
        proceduresLabel: 'Procedimientos',
        proceduresHelper: 'Presiona Enter para agregar',
        clinicLabel: 'Clínica',
        clinicRequired: 'Selecciona una clínica',
        nameRequired: 'El nombre debe tener al menos 2 caracteres',
        descriptionOptional: 'Descripción (opcional)',
        more: 'y {{count}} más',
      };
      if (ns === 'common') {
        const common: Record<string, string> = {
          name: 'Nombre',
          cancel: 'Cancelar',
          delete: 'Eliminar',
          edit: 'Editar',
          create: 'Crear',
          add: 'Agregar',
          thisActionCannotBeUndone: 'Esta acción no se puede deshacer',
          records: 'registros',
        };
        return common[key] ?? key;
      }
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

vi.mock('@/modules/specialties/hooks/useSpecialties', () => ({
  useSpecialtyList: () => mockHookReturn,
  useCreateSpecialty: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateSpecialty: () => ({ mutate: vi.fn(), isPending: false }),
  useDeleteSpecialty: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('@/modules/super-admin/services/super-admin.service', () => ({
  superAdminService: {
    listTenants: vi.fn(() => Promise.resolve({ data: [] })),
  },
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <AppThemeProvider>
        <SpecialtiesPage />
      </AppThemeProvider>
    </MemoryRouter>,
  );
}

function makeSpecialty(id: number, name: string) {
  return {
    id,
    tenant_id: '1',
    name,
    icon: '🩺',
    description: 'Descripción de ' + name,
    department: 'Cardiología',
    color: '#1976D2',
    procedures: ['Consulta', 'Control'],
    created_at: '2026-01-01T00:00:00Z',
    doctors: [
      { id: 1, name: 'Juan Perez', email: 'juan@clinic.com' },
      { id: 2, name: 'Ana Martinez', email: 'ana@clinic.com' },
    ],
  };
}

describe('SpecialtiesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHookReturn.isLoading = true;
    mockHookReturn.data = undefined;
    mockHookReturn.error = null;
    mockHookReturn.refetch = vi.fn();
  });

  it('shows loading skeleton while data is being fetched', () => {
    mockHookReturn.isLoading = true;
    renderPage();
    expect(screen.getByRole('heading', { name: 'Especialidades' })).toBeInTheDocument();
  });

  it('renders the page title', () => {
    mockHookReturn.isLoading = false;
    mockHookReturn.data = { data: [], total: 0, totalPages: 0 };
    renderPage();
    expect(screen.getByRole('heading', { name: 'Especialidades' })).toBeInTheDocument();
  });

  it('renders specialty rows when data is loaded', () => {
    mockHookReturn.isLoading = false;
    mockHookReturn.data = {
      data: [makeSpecialty(1, 'Cardiología'), makeSpecialty(2, 'Pediatría')],
      total: 2,
      totalPages: 1,
    };
    renderPage();
    const rows = screen.getAllByTestId('specialty-row');
    expect(rows).toHaveLength(2);
    expect(screen.getAllByText('Cardiología').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Pediatría')).toBeInTheDocument();
  });

  it('shows empty state when there are no specialties', () => {
    mockHookReturn.isLoading = false;
    mockHookReturn.data = { data: [], total: 0, totalPages: 0 };
    renderPage();
    expect(screen.getByText('No se encontraron especialidades')).toBeInTheDocument();
    expect(screen.getByText('Crea tu primera especialidad para comenzar.')).toBeInTheDocument();
  });

  it('displays the search input field', () => {
    mockHookReturn.isLoading = false;
    mockHookReturn.data = { data: [], total: 0, totalPages: 0 };
    renderPage();
    expect(
      screen.getByPlaceholderText('Buscar especialidades...'),
    ).toBeInTheDocument();
  });

  it('does not render specialty rows while loading', () => {
    mockHookReturn.isLoading = true;
    renderPage();
    expect(screen.queryByTestId('specialty-row')).not.toBeInTheDocument();
  });
});
