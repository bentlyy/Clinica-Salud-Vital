import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AppThemeProvider } from '@/shared/providers/ThemeProvider';
import { UserDetailDialog } from '@/modules/users/components/UserDetailDialog';
import { formatDate } from '@/shared/utils/localeUtils';
import type { User } from '@/modules/users/types/user.types';

vi.mock('@/i18n/i18n', () => ({
  default: { language: 'es', on: vi.fn() },
}));

vi.mock('react-i18next', () => ({
  useTranslation: (ns?: string) => {
    const users: Record<string, string> = {
      phone_optional: 'Teléfono',
      createdAt: 'Creado',
      edit_limitation: 'La edición de usuarios estará disponible próximamente.',
      status_active: 'Activo',
      status_inactive: 'Inactivo',
    };
    const common: Record<string, string> = {
      email: 'Email',
      close: 'Cerrar',
    };
    const translations = ns === 'common' ? common : users;
    return {
      t: (key: string) => translations[key] ?? key,
      i18n: { language: 'es' },
    };
  },
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

const user: User = {
  id: 1,
  email: 'ana@clinic.cl',
  name: 'Ana Pérez',
  role: 'doctor',
  is_active: true,
  rut: '11.111.111-1',
  phone: '+56 9 1111 1111',
  created_at: '2024-05-01T10:00:00Z',
  updated_at: '2024-05-01T10:00:00Z',
};

describe('UserDetailDialog', () => {
  it('renders user details when open with a user', () => {
    const onClose = vi.fn();
    render(
      <AppThemeProvider>
        <UserDetailDialog user={user} open onClose={onClose} />
      </AppThemeProvider>,
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Ana Pérez')).toBeInTheDocument();
    expect(screen.getByText('ana@clinic.cl')).toBeInTheDocument();
    expect(screen.getByText('+56 9 1111 1111')).toBeInTheDocument();
    expect(screen.getByText('11.111.111-1')).toBeInTheDocument();
    expect(screen.getByText(formatDate(user.created_at))).toBeInTheDocument();
    expect(screen.getByText('La edición de usuarios estará disponible próximamente.')).toBeInTheDocument();
  });

  it('does not render content when no user is provided', () => {
    render(
      <AppThemeProvider>
        <UserDetailDialog user={null} open onClose={vi.fn()} />
      </AppThemeProvider>,
    );
    expect(screen.queryByText('ana@clinic.cl')).not.toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(
      <AppThemeProvider>
        <UserDetailDialog user={user} open onClose={onClose} />
      </AppThemeProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
