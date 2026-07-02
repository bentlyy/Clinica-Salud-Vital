import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ProtectedRoute from '../../routes/ProtectedRoute';

const mockUseAuth = vi.fn();

vi.mock('../../context/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('../../i18n/useI18n', () => ({
  useI18n: () => ({ t: (key: string) => key === 'protected.loading_session' ? 'Cargando sesión...' : key }),
}));

afterEach(() => {
  mockUseAuth.mockReset();
});

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe('ProtectedRoute', () => {
  it('shows LoadingState while loading', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: true });
    renderWithRouter(
      <ProtectedRoute><div>Contenido protegido</div></ProtectedRoute>
    );
    expect(screen.getByText('Cargando sesión...')).toBeInTheDocument();
    expect(screen.queryByText('Contenido protegido')).not.toBeInTheDocument();
  });

  it('redirects to /login when user is null', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    renderWithRouter(
      <ProtectedRoute><div>Contenido protegido</div></ProtectedRoute>
    );
    expect(screen.queryByText('Contenido protegido')).not.toBeInTheDocument();
  });

  it('renders children when user is authenticated and no role required', () => {
    mockUseAuth.mockReturnValue({ user: { role: 'admin' }, loading: false });
    renderWithRouter(
      <ProtectedRoute><div>Contenido protegido</div></ProtectedRoute>
    );
    expect(screen.getByText('Contenido protegido')).toBeInTheDocument();
  });

  it('renders children when user has required role', () => {
    mockUseAuth.mockReturnValue({ user: { role: 'doctor' }, loading: false });
    renderWithRouter(
      <ProtectedRoute role="doctor"><div>Panel doctor</div></ProtectedRoute>
    );
    expect(screen.getByText('Panel doctor')).toBeInTheDocument();
  });

  it('redirects to / when user lacks required role', () => {
    mockUseAuth.mockReturnValue({ user: { role: 'patient' }, loading: false });
    renderWithRouter(
      <ProtectedRoute role="doctor"><div>Panel doctor</div></ProtectedRoute>
    );
    expect(screen.queryByText('Panel doctor')).not.toBeInTheDocument();
  });

  it('allows superadmin to access admin routes', () => {
    mockUseAuth.mockReturnValue({ user: { role: 'superadmin' }, loading: false });
    renderWithRouter(
      <ProtectedRoute role="admin"><div>Panel admin</div></ProtectedRoute>
    );
    expect(screen.getByText('Panel admin')).toBeInTheDocument();
  });
});
