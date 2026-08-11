import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AppThemeProvider } from '@/shared/providers/ThemeProvider';
import { DashboardLayout } from '@/shared/components/layout/DashboardLayout';

const mockNavigate = vi.hoisted(() => vi.fn());
const mockLogout = vi.hoisted(() => vi.fn());
const mockHasFeature = vi.hoisted(() => vi.fn(() => true));
const mockAuth = vi.hoisted(() => ({ user: null as Record<string, unknown> | null }));
const useMediaQueryMock = vi.hoisted(() => vi.fn(() => false));

vi.mock('@/shared/providers/AuthProvider', () => ({
  useAuth: () => ({
    user: mockAuth.user,
    logout: mockLogout,
    isAuthenticated: Boolean(mockAuth.user),
    isLoading: false,
  }),
}));

vi.mock('@/shared/hooks/useFeature', () => ({
  useFeature: () => ({
    features: {},
    hasFeature: mockHasFeature,
    loading: false,
    reload: vi.fn(),
  }),
}));

vi.mock('@mui/material', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@mui/material')>();
  return { ...actual, useMediaQuery: useMediaQueryMock };
});

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('@/modules/notifications/components/NotificationBell', () => ({
  NotificationBell: () => <div>NotificationBell mock</div>,
}));

const adminUser = {
  id: 1,
  name: 'Dr. Test',
  email: 'dr@clinic.com',
  role: 'admin',
  tenant_id: 1,
  tenant_name: 'Clínica',
  tenant_slug: 'clinica',
  token_version: 1,
  iat: 1,
  exp: 9999999999,
};

function renderDashboard(user: Record<string, unknown> | null = adminUser) {
  mockAuth.user = user;
  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <AppThemeProvider>
        <Routes>
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<div>Page content</div>} />
          </Route>
        </Routes>
      </AppThemeProvider>
    </MemoryRouter>,
  );
}

describe('DashboardLayout', () => {
  beforeEach(() => {
    useMediaQueryMock.mockReturnValue(false);
    localStorage.clear();
  });

  afterEach(() => {
    mockNavigate.mockReset();
    mockLogout.mockReset();
    mockHasFeature.mockReset();
  });

  it('renders the page content through the Outlet', () => {
    renderDashboard();
    expect(screen.getByText('Page content')).toBeInTheDocument();
  });

  it('renders the user name and role label in the sidebar footer', () => {
    renderDashboard();
    expect(screen.getByText('Dr. Test')).toBeInTheDocument();
    expect(screen.getByText('Administrador')).toBeInTheDocument();
  });

  it('renders the nav items for the user role', () => {
    renderDashboard();
    expect(screen.getByText('dashboard')).toBeInTheDocument();
    expect(screen.getByText('clinical')).toBeInTheDocument();
    expect(screen.getByText('management')).toBeInTheDocument();
  });

  it('navigates when a nav item is clicked', () => {
    renderDashboard();
    fireEvent.click(screen.getByText('management'));
    expect(mockNavigate).toHaveBeenCalledWith('/management');
  });

  it('calls logout when the sidebar logout button is clicked', () => {
    const { container } = renderDashboard();
    const drawer = container.querySelector('.MuiDrawer-paper')!;
    const buttons = within(drawer as HTMLElement).getAllByRole('button');
    const logoutButton = buttons[buttons.length - 1];
    fireEvent.click(logoutButton);
    expect(mockLogout).toHaveBeenCalledTimes(1);
  });

  it('shows the notification bell for staff roles', () => {
    renderDashboard(adminUser);
    expect(screen.getByText('NotificationBell mock')).toBeInTheDocument();
  });

  it('does not show the notification bell for patients', () => {
    renderDashboard({ ...adminUser, role: 'patient' });
    expect(screen.queryByText('NotificationBell mock')).not.toBeInTheDocument();
  });

  it('toggles the theme and persists the mode', () => {
    renderDashboard();
    expect(localStorage.getItem('theme_mode')).toBeNull();
    fireEvent.click(screen.getByTestId('DarkModeIcon').closest('button')!);
    expect(localStorage.getItem('theme_mode')).toBe('dark');
  });

  it('opens the collapsed sidebar on mobile when the hamburger is clicked', () => {
    useMediaQueryMock.mockReturnValue(true);
    renderDashboard();
    // Temporary drawer starts closed on mobile
    expect(screen.queryByText('dashboard')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('MenuIcon').closest('button')!);
    expect(screen.getByText('dashboard')).toBeInTheDocument();
  });
});
