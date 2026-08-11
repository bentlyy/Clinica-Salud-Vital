import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AppThemeProvider } from '@/shared/providers/ThemeProvider';
import { DeleteSpecialtyDialog } from '@/modules/specialties/components/DeleteSpecialtyDialog';
import type { Specialty } from '@/modules/specialties/types/specialty.types';

vi.mock('@/i18n/i18n', () => ({ default: { language: 'es', on: vi.fn() } }));

vi.mock('react-i18next', () => {
  const translations: Record<string, string> = {
    deleteTitle: 'Eliminar Especialidad',
    confirmDeleteMessage: '¿Eliminar <strong>{{name}}</strong>?',
  };
  const common: Record<string, string> = {
    delete: 'Eliminar',
    cancel: 'Cancelar',
    thisActionCannotBeUndone: 'Esta acción no se puede deshacer',
    processing: 'Procesando...',
  };
  const interpolate = (str: string, opts?: Record<string, unknown>) =>
    opts ? str.replace(/\{\{(\w+)\}\}/g, (_, k) => String(opts[k] ?? '')) : str;
  const t = (key: string, opts?: Record<string, unknown> | string, ns?: string) => {
    const map = ns === 'common' ? common : translations;
    const mapped = map[key];
    if (mapped) return interpolate(mapped, opts as Record<string, unknown> | undefined);
    if (typeof opts === 'string') return opts;
    return key;
  };
  return {
    useTranslation: (ns?: string) => ({ t: (key: string, opts?: Record<string, unknown> | string) => t(key, opts, ns), i18n: { language: 'es' } }),
  };
});

const specialty: Specialty = {
  id: 1,
  tenant_id: 't1',
  name: 'Cardiología',
  created_at: '2026-01-01T00:00:00Z',
};

function renderDialog(overrides: Partial<React.ComponentProps<typeof DeleteSpecialtyDialog>> = {}) {
  const props = {
    specialty,
    isPending: false,
    onClose: vi.fn(),
    onConfirm: vi.fn(),
    ...overrides,
  };
  return { props, ...render(
    <AppThemeProvider>
      <DeleteSpecialtyDialog {...props} />
    </AppThemeProvider>,
  ) };
}

describe('DeleteSpecialtyDialog', () => {
  it('is closed when no specialty is provided', () => {
    renderDialog({ specialty: null });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders the title and the confirmation message with the specialty name', () => {
    renderDialog();
    expect(screen.getByText('Eliminar Especialidad')).toBeInTheDocument();
    expect(screen.getByText('Cardiología')).toBeInTheDocument();
    expect(screen.getByText('Esta acción no se puede deshacer')).toBeInTheDocument();
  });

  it('calls onConfirm when the delete button is clicked', () => {
    const { props } = renderDialog();
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar' }));
    expect(props.onConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when the cancel button is clicked', () => {
    const { props } = renderDialog();
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it('disables the actions while pending', () => {
    renderDialog({ isPending: true });
    expect(screen.getByRole('button', { name: 'Procesando...' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
  });
});
