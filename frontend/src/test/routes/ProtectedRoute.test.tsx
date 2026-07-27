import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { useAuth } from '@/shared/providers/AuthProvider';

const mockUseAuth = vi.fn();

vi.mock('@/shared/providers/AuthProvider', () => ({
  useAuth: () => mockUseAuth(),
}));

function ProtectedRoute({
  children,
  allowedRoles,
}: {
  children: React.ReactNode;
  allowedRoles?: string[];
}) {
  const { user, isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <div>Loading...</div>;
  if (!isAuthenticated) return <div>Redirected to home</div>;
  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <div>Redirected to dashboard</div>;
  }
  return <>{children}</>;
}

function renderWithRouter(ui: React.ReactElement, initialEntry = '/protected') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/protected" element={ui} />
        <Route path="/" element={<div>Home</div>} />
        <Route path="/dashboard" element={<div>Dashboard</div>} />
      </Routes>
    </MemoryRouter>
  );
}

afterEach(() => {
  mockUseAuth.mockReset();
});

describe('ProtectedRoute', () => {
  it('shows loading while auth is loading', () => {
    mockUseAuth.mockReturnValue({ user: null, isAuthenticated: false, isLoading: true });
    renderWithRouter(
      <ProtectedRoute><div>Protected content</div></ProtectedRoute>
    );
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
  });

  it('redirects to home when not authenticated', () => {
    mockUseAuth.mockReturnValue({ user: null, isAuthenticated: false, isLoading: false });
    renderWithRouter(
      <ProtectedRoute><div>Protected content</div></ProtectedRoute>
    );
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
    expect(screen.getByText('Redirected to home')).toBeInTheDocument();
  });

  it('renders children when authenticated and no role required', () => {
    mockUseAuth.mockReturnValue({ user: { role: 'admin' }, isAuthenticated: true, isLoading: false });
    renderWithRouter(
      <ProtectedRoute><div>Protected content</div></ProtectedRoute>
    );
    expect(screen.getByText('Protected content')).toBeInTheDocument();
  });

  it('renders children when user has required role', () => {
    mockUseAuth.mockReturnValue({ user: { role: 'doctor' }, isAuthenticated: true, isLoading: false });
    renderWithRouter(
      <ProtectedRoute allowedRoles={['doctor']}><div>Doctor panel</div></ProtectedRoute>
    );
    expect(screen.getByText('Doctor panel')).toBeInTheDocument();
  });

  it('redirects when user lacks required role', () => {
    mockUseAuth.mockReturnValue({ user: { role: 'patient' }, isAuthenticated: true, isLoading: false });
    renderWithRouter(
      <ProtectedRoute allowedRoles={['admin']}><div>Admin panel</div></ProtectedRoute>
    );
    expect(screen.queryByText('Admin panel')).not.toBeInTheDocument();
    expect(screen.getByText('Redirected to dashboard')).toBeInTheDocument();
  });

  it('allows superadmin to access admin routes', () => {
    mockUseAuth.mockReturnValue({ user: { role: 'superadmin' }, isAuthenticated: true, isLoading: false });
    renderWithRouter(
      <ProtectedRoute allowedRoles={['admin', 'superadmin']}><div>Admin panel</div></ProtectedRoute>
    );
    expect(screen.getByText('Admin panel')).toBeInTheDocument();
  });
});
