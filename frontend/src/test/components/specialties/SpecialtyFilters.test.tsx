import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AppThemeProvider } from '@/shared/providers/ThemeProvider';
import { SpecialtyFilters } from '@/modules/specialties/components/SpecialtyFilters';

vi.mock('react-i18next', () => {
  const translations: Record<string, string> = {
    searchPlaceholder: 'Buscar especialidades...',
    clinicFilter: 'Filtrar por clínica',
    allClinics: 'Todas las clínicas',
  };
  return {
    useTranslation: () => ({
      t: (key: string, fallback?: string) => translations[key] ?? fallback ?? key,
      i18n: { language: 'es' },
    }),
  };
});

const clinics = [
  { id: 't1', name: 'Clínica Norte' },
  { id: 't2', name: 'Clínica Sur' },
] as { id: string; name: string; active: boolean; plan: string }[];

function renderFilters(overrides: Partial<React.ComponentProps<typeof SpecialtyFilters>> = {}) {
  const props = {
    search: '',
    onSearchChange: vi.fn(),
    clinicFilter: '',
    onClinicFilterChange: vi.fn(),
    clinics: clinics as React.ComponentProps<typeof SpecialtyFilters>['clinics'],
    isSuperAdmin: false,
    ...overrides,
  };
  return { props, ...render(
    <AppThemeProvider>
      <SpecialtyFilters {...props} />
    </AppThemeProvider>,
  ) };
}

describe('SpecialtyFilters', () => {
  it('renders the search input and forwards changes', () => {
    const { props } = renderFilters();
    const input = screen.getByPlaceholderText('Buscar especialidades...');
    fireEvent.change(input, { target: { value: 'cardio' } });
    expect(props.onSearchChange).toHaveBeenCalledWith('cardio');
  });

  it('shows a clear button when search is not empty', () => {
    const { props } = renderFilters({ search: 'cardio' });
    fireEvent.click(screen.getByRole('button', { name: 'clear search' }));
    expect(props.onSearchChange).toHaveBeenCalledWith('');
  });

  it('hides the clinic filter for non super admins', () => {
    renderFilters({ isSuperAdmin: false });
    expect(screen.queryByLabelText('Filtrar por clínica')).not.toBeInTheDocument();
  });

  it('renders the clinic filter with options for super admins', () => {
    const { props } = renderFilters({ isSuperAdmin: true });
    fireEvent.mouseDown(screen.getByLabelText('Filtrar por clínica'));
    expect(screen.getByText('Todas las clínicas')).toBeInTheDocument();
    expect(screen.getByText('Clínica Norte')).toBeInTheDocument();
    expect(screen.getByText('Clínica Sur')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Clínica Norte'));
    expect(props.onClinicFilterChange).toHaveBeenCalledWith('t1');
  });
});
