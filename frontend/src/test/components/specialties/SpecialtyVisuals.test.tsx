import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AppThemeProvider } from '@/shared/providers/ThemeProvider';
import {
  withAlpha,
  getSpecialtyColor,
  ColorIndicator,
  SpecialtyIcon,
  DepartmentChip,
  ProcedureBadge,
  DoctorAvatarGroup,
  RowCardMotion,
} from '@/modules/specialties/components/SpecialtyVisuals';
import type { Specialty } from '@/modules/specialties/types/specialty.types';

vi.mock('framer-motion', () => {
  const PassThrough = (props: { children?: React.ReactNode }) => props.children ?? null;
  return {
    motion: new Proxy(PassThrough, {
      apply: () => PassThrough,
      get: () => PassThrough,
    }),
  };
});

const specialty: Specialty = {
  id: 1,
  tenant_id: 't1',
  name: 'Cardiología',
  color: '#0d9488',
  icon: '🫀',
  created_at: '2026-01-01T00:00:00Z',
};

describe('SpecialtyVisuals helpers', () => {
  it('withAlpha converts a valid hex color to rgba', () => {
    expect(withAlpha('#0d9488', 0.25)).toBe('rgba(13, 148, 136, 0.25)');
  });

  it('withAlpha falls back to the default brand color for invalid colors', () => {
    expect(withAlpha('red', 0.5)).toBe('rgba(13, 148, 136, 0.5)');
  });

  it('getSpecialtyColor returns the specialty color or a default', () => {
    expect(getSpecialtyColor(specialty)).toBe('#0d9488');
    expect(getSpecialtyColor({ ...specialty, color: undefined })).toBe('#0d9488');
  });

  it('ColorIndicator renders the color', () => {
    const { container } = render(<ColorIndicator color="#123456" />);
    expect(container.firstChild).toHaveStyle({ backgroundColor: '#123456' });
  });

  it('SpecialtyIcon renders the custom icon', () => {
    render(
      <AppThemeProvider>
        <SpecialtyIcon specialty={specialty} />
      </AppThemeProvider>,
    );
    expect(screen.getByText('🫀')).toBeInTheDocument();
  });

  it('SpecialtyIcon falls back to the medical symbol', () => {
    render(
      <AppThemeProvider>
        <SpecialtyIcon specialty={{ ...specialty, icon: undefined }} />
      </AppThemeProvider>,
    );
    expect(screen.getByText('🩺')).toBeInTheDocument();
  });

  it('DepartmentChip renders the department label and null when absent', () => {
    render(
      <AppThemeProvider>
        <DepartmentChip department="Cardiología" color="#0d9488" />
      </AppThemeProvider>,
    );
    expect(screen.getByText('Cardiología')).toBeInTheDocument();
    const { container } = render(
      <AppThemeProvider>
        <DepartmentChip department={undefined} />
      </AppThemeProvider>,
    );
    expect(container.querySelector('.MuiChip-root')).toBeNull();
  });

  it('ProcedureBadge renders the count and null when there are no procedures', () => {
    render(
      <AppThemeProvider>
        <ProcedureBadge procedures={['A', 'B']} />
      </AppThemeProvider>,
    );
    expect(screen.getByText('2')).toBeInTheDocument();
    const { container } = render(
      <AppThemeProvider>
        <ProcedureBadge procedures={[]} />
      </AppThemeProvider>,
    );
    expect(container.querySelector('.MuiBox-root')).toBeNull();
  });

  it('DoctorAvatarGroup renders initials and an overflow counter', () => {
    const doctors = [
      { id: 1, name: 'Juan Perez', email: 'j@c.cl' },
      { id: 2, name: 'Ana Martinez', email: 'a@c.cl' },
      { id: 3, name: 'Luis Soto', email: 'l@c.cl' },
      { id: 4, name: 'Maria Diaz', email: 'm@c.cl' },
    ];
    render(
      <AppThemeProvider>
        <DoctorAvatarGroup doctors={doctors} max={3} />
      </AppThemeProvider>,
    );
    expect(screen.getByText('JP')).toBeInTheDocument();
    expect(screen.getByText('AM')).toBeInTheDocument();
    expect(screen.getByText('+1')).toBeInTheDocument();
  });

  it('DoctorAvatarGroup returns null when there are no doctors', () => {
    const { container } = render(
      <AppThemeProvider>
        <DoctorAvatarGroup doctors={[]} />
      </AppThemeProvider>,
    );
    expect(container.querySelector('.MuiBox-root')).toBeNull();
  });

  it('RowCardMotion renders its children', () => {
    render(<RowCardMotion><div>contenido</div></RowCardMotion>);
    expect(screen.getByText('contenido')).toBeInTheDocument();
  });
});
