import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AppThemeProvider } from '@/shared/providers/ThemeProvider';

const mockNavigate = vi.hoisted(() => vi.fn());
const useNotificationsMock = vi.hoisted(() => vi.fn());

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('@/modules/notifications/hooks/useNotifications', () => ({
  useNotifications: useNotificationsMock,
}));

import { NotificationBell } from '@/modules/notifications/components/NotificationBell';

function renderBell() {
  return render(
    <MemoryRouter>
      <AppThemeProvider>
        <NotificationBell />
      </AppThemeProvider>
    </MemoryRouter>,
  );
}

describe('NotificationBell', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    useNotificationsMock.mockReturnValue({ data: { total: 3 } });
  });

  it('renders the unread count from the notifications query', () => {
    renderBell();
    expect(useNotificationsMock).toHaveBeenCalledWith({ page: 1, limit: 1 });
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('navigates to the notifications page on click', () => {
    renderBell();
    fireEvent.click(screen.getByRole('button'));
    expect(mockNavigate).toHaveBeenCalledWith('/notifications');
  });

  it('shows no badge content when the total is 0', () => {
    useNotificationsMock.mockReturnValue({ data: { total: 0 } });
    renderBell();
    expect(screen.queryByText('0')).not.toBeInTheDocument();
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('defaults to 0 when the query returns no data', () => {
    useNotificationsMock.mockReturnValue({ data: undefined });
    renderBell();
    expect(screen.getByRole('button')).toBeInTheDocument();
  });
});
