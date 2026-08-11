import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AppThemeProvider } from '@/shared/providers/ThemeProvider';
import { UsersStats } from '@/modules/users/components/UsersStats';
import type { User } from '@/modules/users/types/user.types';

vi.mock('@/i18n/i18n', () => ({
  default: { language: 'es', on: vi.fn() },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        never: 'Nunca',
        time_just_now: 'recién',
        time_minutes: 'min',
        time_hours: 'h',
        time_days: 'días',
        stats_total: 'Total usuarios',
        stats_active: 'Activos',
        stats_inactive: 'Inactivos',
        stats_last_login: 'Último acceso',
        stats_pct: '{{pct}}% del total',
      };
      return translations[key] ?? key;
    },
    i18n: { language: 'es' },
  }),
}));

function makeUser(id: number, overrides: Partial<User> = {}): User {
  return {
    id,
    email: `user${id}@clinic.cl`,
    name: `Usuario ${id}`,
    role: 'doctor',
    is_active: true,
    created_at: '2024-05-01T10:00:00Z',
    updated_at: '2024-05-01T10:00:00Z',
    ...overrides,
  };
}

describe('UsersStats', () => {
  it('renders total, active and inactive counts', () => {
    const users = [
      makeUser(1, { is_active: true }),
      makeUser(2, { is_active: true }),
      makeUser(3, { is_active: false }),
    ];
    render(
      <AppThemeProvider>
        <UsersStats users={users} total={3} />
      </AppThemeProvider>,
    );

    expect(screen.getByText('Total usuarios')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('Activos')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('Inactivos')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('shows percentage sub only when there are users', () => {
    const users = [makeUser(1, { is_active: true }), makeUser(2, { is_active: true })];
    render(
      <AppThemeProvider>
        <UsersStats users={users} total={2} />
      </AppThemeProvider>,
    );
    // 2/2 active => 100%
    expect(screen.getByText('{{pct}}% del total')).toBeInTheDocument();
  });

  it('shows "never" for last login when there are no users', () => {
    render(
      <AppThemeProvider>
        <UsersStats users={[]} total={0} />
      </AppThemeProvider>,
    );
    expect(screen.getByText('Nunca')).toBeInTheDocument();
  });
});
