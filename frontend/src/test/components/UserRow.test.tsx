import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppThemeProvider } from '@/shared/providers/ThemeProvider';
import { UserRow } from '@/modules/users/components/UserRow';
import type { User } from '@/modules/users/types/user.types';

vi.mock('@/i18n/i18n', () => ({
  default: { language: 'es', on: vi.fn() },
}));

vi.mock('react-i18next', () => {
  const translations: Record<string, string> = {
    never: 'Nunca',
    time_just_now: 'recién',
    time_minutes: 'min',
    time_hours: 'h',
    time_days: 'días',
    last_access: 'Último acceso:',
    view_detail: 'Ver detalle',
    deactivate: 'Desactivar',
    activate: 'Activar',
    status_active: 'Activo',
    status_inactive: 'Inactivo',
  };
  return {
    useTranslation: () => ({
      t: (key: string, fallback?: string) => translations[key] ?? fallback ?? key,
      i18n: { language: 'es' },
    }),
  };
});

vi.mock('framer-motion', () => {
  const PassThrough = (props: { children?: React.ReactNode }) => props.children ?? null;
  return {
    motion: new Proxy(PassThrough, {
      apply: () => PassThrough,
      get: () => PassThrough,
    }),
  };
});

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 1,
    email: 'ana@clinic.cl',
    name: 'Ana Pérez',
    role: 'doctor',
    is_active: true,
    rut: '11.111.111-1',
    phone: '+56 9 1111 1111',
    created_at: '2024-05-01T10:00:00Z',
    updated_at: '2024-05-01T10:00:00Z',
    ...overrides,
  };
}

function renderRow(props: Partial<React.ComponentProps<typeof UserRow>> = {}) {
  const onView = vi.fn();
  const onToggle = vi.fn();
  render(
    <AppThemeProvider>
      <UserRow
        user={makeUser()}
        canToggle
        canView
        onView={onView}
        onToggle={onToggle}
        {...props}
      />
    </AppThemeProvider>,
  );
  return { onView, onToggle };
}

describe('UserRow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders user name, role badge and contact info', () => {
    renderRow();
    expect(screen.getByText('Ana Pérez')).toBeInTheDocument();
    expect(screen.getByText('Doctor')).toBeInTheDocument();
    expect(screen.getByText('ana@clinic.cl · +56 9 1111 1111 · 11.111.111-1')).toBeInTheDocument();
  });

  it('shows status badge based on is_active', () => {
    renderRow({ user: makeUser({ is_active: true }) });
    expect(screen.getByText('Activo')).toBeInTheDocument();

    renderRow({ user: makeUser({ is_active: false }) });
    expect(screen.getAllByText('Inactivo').length).toBeGreaterThan(0);
  });

  it('calls onView when the detail button is clicked', () => {
    const { onView } = renderRow();
    fireEvent.click(screen.getByRole('button', { name: 'Ver detalle Ana Pérez' }));
    expect(onView).toHaveBeenCalledTimes(1);
    expect(onView).toHaveBeenCalledWith(expect.objectContaining({ id: 1, name: 'Ana Pérez' }));
  });

  it('calls onToggle when the toggle button is clicked', () => {
    const { onToggle } = renderRow();
    fireEvent.click(screen.getByRole('button', { name: 'Desactivar' }));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('hides action buttons when permissions are not granted', () => {
    renderRow({ canView: false, canToggle: false });
    expect(screen.queryByRole('button', { name: 'Ver detalle Ana Pérez' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Desactivar' })).not.toBeInTheDocument();
  });

  it('disables the toggle button while toggling', () => {
    renderRow({ isToggling: true });
    expect(screen.getByRole('button', { name: 'Desactivar' })).toBeDisabled();
  });
});
