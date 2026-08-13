import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AppThemeProvider } from '@/shared/providers/ThemeProvider';
import { getInitials, UserAvatar, RoleBadge, StatusBadge } from '@/modules/users/components/UserVisuals';

vi.mock('@/i18n/i18n', () => ({
  default: { language: 'es', on: vi.fn() },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => {
    const translations: Record<string, string> = {
      status_active: 'Activo',
      status_inactive: 'Inactivo',
      status_active_hint: 'Usuario activo',
      status_inactive_hint: 'Usuario inactivo',
    };
    return {
      t: (key: string, fallback?: string) => translations[key] ?? fallback ?? key,
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

describe('getInitials', () => {
  it('returns up to two uppercase initials', () => {
    expect(getInitials('ana maría pérez')).toBe('AM');
    expect(getInitials('Ana')).toBe('A');
  });

  it('handles empty or whitespace-only names', () => {
    expect(getInitials('')).toBe('');
    expect(getInitials('   ')).toBe('');
  });
});

describe('UserAvatar', () => {
  it('renders initials when no src is provided', () => {
    render(
      <AppThemeProvider>
        <UserAvatar name="Ana Pérez" role="doctor" />
      </AppThemeProvider>,
    );
    expect(screen.getByText('AP')).toBeInTheDocument();
  });

  it('renders fallback question mark for empty names', () => {
    render(
      <AppThemeProvider>
        <UserAvatar name="" role="patient" />
      </AppThemeProvider>,
    );
    expect(screen.getByText('?')).toBeInTheDocument();
  });
});

describe('RoleBadge', () => {
  it('renders the role label', () => {
    render(
      <AppThemeProvider>
        <RoleBadge role="doctor" />
      </AppThemeProvider>,
    );
    expect(screen.getByText('Doctor')).toBeInTheDocument();
  });
});

describe('StatusBadge', () => {
  it('renders active/inactive labels', () => {
    render(
      <AppThemeProvider>
        <StatusBadge isActive />
        <StatusBadge isActive={false} />
      </AppThemeProvider>,
    );
    expect(screen.getByText('Activo')).toBeInTheDocument();
    expect(screen.getByText('Inactivo')).toBeInTheDocument();
  });

  it('calls onClick when provided', () => {
    const onClick = vi.fn();
    render(
      <AppThemeProvider>
        <StatusBadge isActive onClick={onClick} />
      </AppThemeProvider>,
    );
    fireEvent.click(screen.getByText('Activo'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
