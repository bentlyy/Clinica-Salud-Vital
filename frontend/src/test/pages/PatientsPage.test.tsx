import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AppThemeProvider } from '@/shared/providers/ThemeProvider';
import PatientsPage from '@/modules/patients/pages/PatientsPage';

// --- Hoisted mock values ---

const mockHookReturn = vi.hoisted(() => ({
  data: undefined as { data: Record<string, unknown>[]; total: number } | undefined,
  isLoading: true,
  error: null as Error | null,
  refetch: vi.fn(),
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

vi.mock('@/i18n/i18n', () => ({
  default: { language: 'es', on: vi.fn() },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        title: 'Pacientes',
        resultsCount: '0 pacientes registrados',
        loading_patients: 'Cargando pacientes...',
        searchPlaceholder: 'Buscar por nombre, email...',
        gender: 'Genero',
        'genderFilters.all': 'Todos',
        'genderFilters.male': 'Masculino',
        'genderFilters.female': 'Femenino',
        'genderFilters.other': 'Otro',
        name: 'Nombre',
        emailLabel: 'Email',
        phoneLabel: 'Telefono',
        statusLabel: 'Estado',
        colDate: 'Registro',
        active: 'Activo',
        inactive: 'Inactivo',
        rows_per_page: 'Filas por pagina',
        noPatients: 'No se encontraron pacientes',
        noPatientsFiltered: 'Sin resultados',
        noPatientsEmpty: 'No hay pacientes registrados',
      };
      return translations[key] ?? key;
    },
    i18n: { language: 'es' },
  }),
}));

vi.mock('@/modules/patients/hooks/usePatients', () => ({
  usePatientList: () => mockHookReturn,
}));

// --- Render helper ---

function renderPage() {
  return render(
    <MemoryRouter>
      <AppThemeProvider>
        <PatientsPage />
      </AppThemeProvider>
    </MemoryRouter>,
  );
}

// --- Tests ---

describe('PatientsPage', () => {
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
    expect(screen.getByText('Cargando pacientes...')).toBeInTheDocument();
  });

  it('renders the page title', () => {
    mockHookReturn.isLoading = false;
    mockHookReturn.data = { data: [], total: 0 };
    renderPage();
    expect(screen.getByText('Pacientes')).toBeInTheDocument();
  });

  it('renders patient list when data is loaded', () => {
    mockHookReturn.isLoading = false;
    mockHookReturn.data = {
      data: [
        {
          id: 1,
          name: 'Maria Garcia',
          email: 'maria@example.com',
          phone: '+56912345678',
          gender: 'female',
          is_active: true,
          avatar_url: null,
          created_at: '2026-01-15T10:00:00Z',
        },
      ],
      total: 1,
    };
    renderPage();
    expect(screen.getByText('Maria Garcia')).toBeInTheDocument();
    expect(screen.getByText('maria@example.com')).toBeInTheDocument();
    expect(screen.getByText('+56912345678')).toBeInTheDocument();
  });

  it('displays the search input field', () => {
    mockHookReturn.isLoading = false;
    mockHookReturn.data = { data: [], total: 0 };
    renderPage();
    expect(screen.getByPlaceholderText('Buscar por nombre, email...')).toBeInTheDocument();
  });

  it('shows active status chip for active patients', () => {
    mockHookReturn.isLoading = false;
    mockHookReturn.data = {
      data: [
        {
          id: 1,
          name: 'Juan Perez',
          email: 'juan@example.com',
          phone: null,
          gender: 'male',
          is_active: true,
          avatar_url: null,
          created_at: '2026-01-15T10:00:00Z',
        },
      ],
      total: 1,
    };
    renderPage();
    expect(screen.getByText('Activo')).toBeInTheDocument();
  });

  it('shows empty state when there are no patients', () => {
    mockHookReturn.isLoading = false;
    mockHookReturn.data = { data: [], total: 0 };
    renderPage();
    expect(screen.getByText('No se encontraron pacientes')).toBeInTheDocument();
  });

  it('does not render patient table while loading', () => {
    mockHookReturn.isLoading = true;
    renderPage();
    expect(screen.queryByText('Maria Garcia')).not.toBeInTheDocument();
    expect(screen.queryByText('Buscar por nombre, email...')).not.toBeInTheDocument();
  });
});
