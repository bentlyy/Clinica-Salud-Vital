import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AppThemeProvider } from '@/shared/providers/ThemeProvider';
import { UserStatusChip } from '@/modules/users/components/UserStatusChip';

vi.mock('@/i18n/i18n', () => ({
  default: { language: 'es', on: vi.fn() },
}));

describe('UserStatusChip', () => {
  it('renders Activo for active users', () => {
    render(
      <AppThemeProvider>
        <UserStatusChip isActive />
      </AppThemeProvider>,
    );
    expect(screen.getByText('Activo')).toBeInTheDocument();
  });

  it('renders Inactivo for inactive users', () => {
    render(
      <AppThemeProvider>
        <UserStatusChip isActive={false} />
      </AppThemeProvider>,
    );
    expect(screen.getByText('Inactivo')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    render(
      <AppThemeProvider>
        <UserStatusChip isActive onClick={onClick} />
      </AppThemeProvider>,
    );
    fireEvent.click(screen.getByText('Activo'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
