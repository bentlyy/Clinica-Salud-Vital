import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AppThemeProvider } from '@/shared/providers/ThemeProvider';
import { SpecialtyRow } from '@/modules/specialties/components/SpecialtyRow';
import type { Specialty } from '@/modules/specialties/types/specialty.types';

vi.mock('@/i18n/i18n', () => ({ default: { language: 'es', on: vi.fn() } }));

vi.mock('framer-motion', () => {
  const PassThrough = (props: { children?: React.ReactNode }) => props.children ?? null;
  return {
    motion: new Proxy(PassThrough, {
      apply: () => PassThrough,
      get: () => PassThrough,
    }),
  };
});

vi.mock('react-i18next', () => {
  const translations: Record<string, string> = {
    editSpecialty: 'Editar Especialidad',
    doctorsCount: '{{count}} doctores',
  };
  const common: Record<string, string> = {
    delete: 'Eliminar',
  };
  const interpolate = (str: string, opts?: Record<string, unknown>) =>
    opts ? str.replace(/\{\{(\w+)\}\}/g, (_, k) => String(opts[k] ?? '')) : str;
  const t = (key: string, opts?: Record<string, unknown>, ns?: string) => {
    const map = ns === 'common' ? common : translations;
    const mapped = map[key];
    if (mapped) return interpolate(mapped, opts);
    return key;
  };
  return {
    useTranslation: (ns?: string) => ({ t: (key: string, opts?: Record<string, unknown>) => t(key, opts, ns), i18n: { language: 'es' } }),
  };
});

const specialty: Specialty = {
  id: 1,
  tenant_id: 't1',
  name: 'Cardiología',
  description: 'Cuidado del corazón',
  department: 'Cardiología',
  icon: '🫀',
  color: '#0d9488',
  procedures: ['Consulta', 'Control'],
  created_at: '2026-01-01T12:00:00',
  doctors: [
    { id: 1, name: 'Juan Perez', email: 'juan@clinic.cl' },
    { id: 2, name: 'Ana Martinez', email: 'ana@clinic.cl' },
  ],
};

function renderRow(overrides: Partial<React.ComponentProps<typeof SpecialtyRow>> = {}) {
  const props = {
    specialty,
    clinicName: 'Clínica Norte',
    isSuperAdmin: true,
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    ...overrides,
  };
  return { props, ...render(
    <AppThemeProvider>
      <SpecialtyRow {...props} />
    </AppThemeProvider>,
  ) };
}

describe('SpecialtyRow', () => {
  it('renders the specialty info, department, procedures and doctors', () => {
    renderRow();
    // name appears as title and as department chip
    expect(screen.getAllByText('Cardiología').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('Cuidado del corazón')).toBeInTheDocument();
    expect(screen.getByText('2 doctores')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument(); // procedure badge count
    expect(screen.getByText('01-01-2026')).toBeInTheDocument();
  });

  it('shows the clinic badge for super admins with a clinic name', () => {
    renderRow();
    expect(screen.getByTestId('specialty-clinic')).toBeInTheDocument();
    expect(screen.getByText('Clínica Norte')).toBeInTheDocument();
  });

  it('hides the clinic badge for regular users', () => {
    renderRow({ isSuperAdmin: false });
    expect(screen.queryByTestId('specialty-clinic')).not.toBeInTheDocument();
  });

  it('calls onEdit and onDelete with the specialty', () => {
    const { props } = renderRow();
    fireEvent.click(screen.getByTestId('specialty-edit'));
    expect(props.onEdit).toHaveBeenCalledWith(specialty);
    fireEvent.click(screen.getByTestId('specialty-delete'));
    expect(props.onDelete).toHaveBeenCalledWith(specialty);
  });
});
