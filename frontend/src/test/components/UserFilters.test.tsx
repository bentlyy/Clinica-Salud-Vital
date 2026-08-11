import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppThemeProvider } from '@/shared/providers/ThemeProvider';
import { UserFilters, type UserFiltersState } from '@/modules/users/components/UserFilters';

vi.mock('@/i18n/i18n', () => ({
  default: { language: 'es', on: vi.fn() },
}));

vi.mock('react-i18next', () => ({
  useTranslation: (ns?: string) => {
    const translations: Record<string, string> = {
      searchPlaceholder: 'Buscar por nombre o email',
      role: 'Rol',
      status: 'Estado',
      status_active: 'Activo',
      status_inactive: 'Inactivo',
      clearFilters: 'Limpiar filtros',
      roleLabels: {
        all: 'Todos',
        admin: 'Administrador',
        doctor: 'Doctor',
        lab_technician: 'Técnico',
        patient: 'Paciente',
        user: 'Usuario',
      },
    };
    const common: Record<string, string> = {
      search: 'Buscar',
    };
    const t = (key: string) => {
      if (ns === 'common') return common[key] ?? key;
      if (key.startsWith('roleLabels.')) {
        const sub = key.split('.')[1];
        return (translations.roleLabels as Record<string, string>)[sub] ?? key;
      }
      return translations[key] ?? key;
    };
    return { t, i18n: { language: 'es' } };
  },
}));

const baseFilters: UserFiltersState = { search: '', role: '', status: '' };

function renderFilters(overrides: Partial<UserFiltersState> = {}) {
  const onSearchChange = vi.fn();
  const onRoleChange = vi.fn();
  const onStatusChange = vi.fn();
  const onClear = vi.fn();
  render(
    <AppThemeProvider>
      <UserFilters
        filters={{ ...baseFilters, ...overrides }}
        onSearchChange={onSearchChange}
        onRoleChange={onRoleChange}
        onStatusChange={onStatusChange}
        onClear={onClear}
      />
    </AppThemeProvider>,
  );
  return { onSearchChange, onRoleChange, onStatusChange, onClear };
}

describe('UserFilters', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders search input with placeholder', () => {
    renderFilters();
    expect(screen.getByPlaceholderText('Buscar por nombre o email')).toBeInTheDocument();
  });

  it('calls onSearchChange when typing', () => {
    const { onSearchChange } = renderFilters();
    fireEvent.change(screen.getByPlaceholderText('Buscar por nombre o email'), {
      target: { value: 'ana' },
    });
    expect(onSearchChange).toHaveBeenCalledWith('ana');
  });

  it('calls onRoleChange when a role is selected', async () => {
    const { onRoleChange } = renderFilters();
    fireEvent.mouseDown(screen.getByLabelText('Rol'));
    const doctor = await screen.findByRole('option', { name: 'Doctor' });
    fireEvent.click(doctor);
    expect(onRoleChange).toHaveBeenCalledWith('doctor');
  });

  it('calls onStatusChange when a status is selected', async () => {
    const { onStatusChange } = renderFilters();
    fireEvent.mouseDown(screen.getByLabelText('Estado'));
    const inactive = await screen.findByRole('option', { name: 'Inactivo' });
    fireEvent.click(inactive);
    expect(onStatusChange).toHaveBeenCalledWith('inactive');
  });

  it('does not show clear button when no filters are set', () => {
    renderFilters();
    expect(screen.queryByLabelText('Limpiar filtros')).not.toBeInTheDocument();
  });

  it('shows clear button and calls onClear when filters are set', () => {
    const { onClear } = renderFilters({ search: 'ana' });
    fireEvent.click(screen.getByLabelText('Limpiar filtros'));
    expect(onClear).toHaveBeenCalledTimes(1);
  });
});
