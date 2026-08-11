import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AppThemeProvider } from '@/shared/providers/ThemeProvider';
import { SpecialtyStatsCards } from '@/modules/specialties/components/SpecialtyStatsCards';
import type { Specialty } from '@/modules/specialties/types/specialty.types';

vi.mock('@/i18n/i18n', () => ({ default: { language: 'es', on: vi.fn() } }));

vi.mock('react-i18next', () => {
  const translations: Record<string, string> = {
    statsSpecialties: 'Especialidades',
    statsDoctors: 'Doctores',
    statsProcedures: 'Procedimientos',
    statsClinics: 'Clínicas',
  };
  return {
    useTranslation: () => ({
      t: (key: string) => translations[key] ?? key,
      i18n: { language: 'es' },
    }),
  };
});

function makeSpecialty(id: number, tenantId: string, doctors: number, procedures: string[]): Specialty {
  return {
    id,
    tenant_id: tenantId,
    name: `Especialidad ${id}`,
    created_at: '2026-01-01T00:00:00Z',
    doctors: Array.from({ length: doctors }, (_, i) => ({
      id: i + 1,
      name: `Dr. ${i + 1}`,
      email: `dr${i + 1}@clinic.cl`,
    })),
    procedures,
  };
}

describe('SpecialtyStatsCards', () => {
  it('renders specialty, doctor and procedure counts for regular users', () => {
    const specialties = [
      makeSpecialty(1, 't1', 2, ['Consulta', 'Control']),
      makeSpecialty(2, 't1', 1, ['Examen']),
    ];
    render(
      <AppThemeProvider>
        <SpecialtyStatsCards specialties={specialties} isSuperAdmin={false} />
      </AppThemeProvider>,
    );
    expect(screen.getByText('Especialidades')).toBeInTheDocument();
    expect(screen.getByText('Doctores')).toBeInTheDocument();
    expect(screen.getByText('Procedimientos')).toBeInTheDocument();
    expect(screen.getAllByText('2').length).toBeGreaterThanOrEqual(1); // specialties
    expect(screen.getAllByText('3').length).toBeGreaterThanOrEqual(2); // total doctors + procedures
    expect(screen.queryByText('Clínicas')).not.toBeInTheDocument();
  });

  it('adds a clinics card for super admins based on distinct tenants', () => {
    const specialties = [
      makeSpecialty(1, 't1', 1, []),
      makeSpecialty(2, 't2', 1, []),
      makeSpecialty(3, 't2', 1, []),
    ];
    render(
      <AppThemeProvider>
        <SpecialtyStatsCards specialties={specialties} isSuperAdmin clinicCount={10} />
      </AppThemeProvider>,
    );
    expect(screen.getByText('Clínicas')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument(); // distinct tenant count
  });

  it('falls back to the clinicCount prop when there are no distinct tenants', () => {
    render(
      <AppThemeProvider>
        <SpecialtyStatsCards specialties={[]} isSuperAdmin clinicCount={5} />
      </AppThemeProvider>,
    );
    expect(screen.getByText('5')).toBeInTheDocument();
  });
});
