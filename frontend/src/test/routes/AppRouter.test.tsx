import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AppRouter } from '@/app/router/AppRouter';

const mockAuth = vi.hoisted(() => ({
  value: { user: null as Record<string, unknown> | null, isAuthenticated: false, isLoading: false },
}));

const mockFeature = vi.hoisted(() => ({
  value: { hasFeature: vi.fn(() => true), loading: false },
}));

vi.mock('@/shared/providers/AuthProvider', () => ({
  useAuth: () => mockAuth.value,
}));

vi.mock('@/shared/hooks/useFeature', () => ({
  useFeature: () => mockFeature.value,
}));

vi.mock('@/shared/components/layout/DashboardLayout', async () => {
  const { Outlet } = await import('react-router-dom');
  return {
    DashboardLayout: () => (
      <div>
        <span>DashboardLayout mock</span>
        <Outlet />
      </div>
    ),
  };
});

vi.mock('@/modules/landing/LandingPage', () => ({
  default: () => <div>Landing Page</div>,
}));

vi.mock('@/modules/auth/pages/NotFoundPage', () => ({
  default: () => <div>Not Found Page</div>,
}));

vi.mock('@/modules/dashboard/pages/DashboardPage', () => ({
  default: () => <div>Dashboard Page</div>,
}));

vi.mock('@/modules/laboratory/pages/LabDashboardPage', () => ({
  default: () => <div>Lab Dashboard</div>,
}));

const adminUser = {
  id: 1,
  name: 'Admin',
  email: 'admin@clinic.com',
  role: 'admin',
  tenant_id: 1,
  tenant_name: 'Clínica',
  tenant_slug: 'clinica',
  token_version: 1,
  iat: 1,
  exp: 9999999999,
};

const labTechnicianUser = { ...adminUser, role: 'lab_technician' };

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppRouter />
    </MemoryRouter>,
  );
}

describe('AppRouter', () => {
  beforeEach(() => {
    mockAuth.value = { user: null, isAuthenticated: false, isLoading: false };
    mockFeature.value = { hasFeature: vi.fn(() => true), loading: false };
  });

  it('shows the loading state while authentication is resolving', () => {
    mockAuth.value = { user: null, isAuthenticated: false, isLoading: true };
    const { container } = renderAt('/dashboard');
    expect(container.querySelector('.MuiCircularProgress-root')).toBeInTheDocument();
  });

  it('redirects unauthenticated users to the public landing page', async () => {
    renderAt('/dashboard');
    expect(await screen.findByText('Landing Page')).toBeInTheDocument();
  });

  it('renders the public landing page at the root route', async () => {
    renderAt('/');
    expect(await screen.findByText('Landing Page')).toBeInTheDocument();
  });

  it('renders public routes for unauthenticated users', async () => {
    // /register is public: even unauthenticated users must reach it without redirect
    mockAuth.value = { user: null, isAuthenticated: false, isLoading: false };
    renderAt('/');
    expect(await screen.findByText('Landing Page')).toBeInTheDocument();
  });

  it('renders protected pages inside the dashboard layout for authenticated users', async () => {
    mockAuth.value = { user: adminUser, isAuthenticated: true, isLoading: false };
    renderAt('/dashboard');
    expect(await screen.findByText('DashboardLayout mock')).toBeInTheDocument();
    expect(await screen.findByText('Dashboard Page')).toBeInTheDocument();
  });

  it('shows the premium lock for features not included in the plan', async () => {
    mockAuth.value = { user: labTechnicianUser, isAuthenticated: true, isLoading: false };
    mockFeature.value.hasFeature.mockReturnValue(false);
    renderAt('/laboratory');
    expect(await screen.findByRole('heading', { name: 'Laboratorio' })).toBeInTheDocument();
    expect(screen.queryByText('Lab Dashboard')).not.toBeInTheDocument();
  });

  it('renders feature-protected routes when the feature is enabled', async () => {
    mockAuth.value = { user: labTechnicianUser, isAuthenticated: true, isLoading: false };
    renderAt('/laboratory');
    expect(await screen.findByText('Lab Dashboard')).toBeInTheDocument();
  });

  it('renders the not-found page for unknown routes', async () => {
    mockAuth.value = { user: adminUser, isAuthenticated: true, isLoading: false };
    renderAt('/does-not-exist');
    expect(await screen.findByText('Not Found Page')).toBeInTheDocument();
  });
});
