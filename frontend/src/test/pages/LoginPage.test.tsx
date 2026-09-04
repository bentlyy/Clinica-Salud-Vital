import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AppThemeProvider } from '@/shared/providers/ThemeProvider';
import LoginPage from '@/modules/auth/pages/LoginPage';

const mockLogin = vi.hoisted(() => vi.fn());
const mockNavigate = vi.hoisted(() => vi.fn());

vi.mock('@/shared/providers/AuthProvider', () => ({
  useAuth: () => ({
    login: mockLogin,
    user: null,
    isAuthenticated: false,
    isLoading: false,
    logout: vi.fn(),
    logoutAll: vi.fn(),
    hasPermission: vi.fn(),
  }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        title: 'Iniciar Sesion',
        subtitle: 'Accede a tu panel de clinica',
        email_label: 'Email',
        password_label: 'Contrasena',
        login_button: 'Iniciar Sesion',
        email_invalid: 'Ingresa un email valido',
        password_min_length: 'La contrasena debe tener al menos 6 caracteres',
        login_error: 'Error al iniciar sesion',
      };
      return translations[key] ?? key;
    },
    i18n: { language: 'es' },
  }),
}));

function renderLoginPage() {
  return render(
    <MemoryRouter>
      <AppThemeProvider>
        <LoginPage />
      </AppThemeProvider>
    </MemoryRouter>,
  );
}

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the login form with email, password, and submit button', () => {
    renderLoginPage();
    expect(screen.getByRole('heading', { name: 'Iniciar Sesion' })).toBeInTheDocument();
    expect(screen.getByText('Accede a tu panel de clinica')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Contrasena')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /iniciar sesion/i })).toBeInTheDocument();
  });

  it('shows validation error when email is empty', async () => {
    renderLoginPage();
    fireEvent.click(screen.getByRole('button', { name: /iniciar sesion/i }));
    await waitFor(() => {
      expect(screen.getByText('Ingresa un email valido')).toBeInTheDocument();
    });
  });

  it('shows validation error for invalid email format', async () => {
    renderLoginPage();
    fireEvent.input(screen.getByLabelText('Email'), { target: { value: 'notanemail' } });
    fireEvent.click(screen.getByRole('button', { name: /iniciar sesion/i }));
    await waitFor(() => {
      expect(screen.getByText('Ingresa un email valido')).toBeInTheDocument();
    });
  });

  it('shows validation error when password is too short', async () => {
    renderLoginPage();
    fireEvent.input(screen.getByLabelText('Email'), { target: { value: 'test@example.com' } });
    fireEvent.input(screen.getByLabelText('Contrasena'), { target: { value: '123' } });
    fireEvent.click(screen.getByRole('button', { name: /iniciar sesion/i }));
    await waitFor(() => {
      expect(screen.getByText('La contrasena debe tener al menos 6 caracteres')).toBeInTheDocument();
    });
  });

  it('calls login with email and password on valid submission', async () => {
    mockLogin.mockResolvedValue({ requires_2fa: false });
    renderLoginPage();
    fireEvent.input(screen.getByLabelText('Email'), { target: { value: 'admin@clinic.com' } });
    fireEvent.input(screen.getByLabelText('Contrasena'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /iniciar sesion/i }));
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('admin@clinic.com', 'password123');
    });
  });

  it('navigates to /dashboard after successful login', async () => {
    mockLogin.mockResolvedValue({ requires_2fa: false });
    renderLoginPage();
    fireEvent.input(screen.getByLabelText('Email'), { target: { value: 'admin@clinic.com' } });
    fireEvent.input(screen.getByLabelText('Contrasena'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /iniciar sesion/i }));
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('navigates to /2fa when login requires two-factor auth', async () => {
    mockLogin.mockResolvedValue({ requires_2fa: true });
    renderLoginPage();
    fireEvent.input(screen.getByLabelText('Email'), { target: { value: 'admin@clinic.com' } });
    fireEvent.input(screen.getByLabelText('Contrasena'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /iniciar sesion/i }));
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/2fa');
    });
  });

  it('displays error message when login fails with API error', async () => {
    mockLogin.mockRejectedValue({
      response: { data: { error: 'Credenciales incorrectas' } },
    });
    renderLoginPage();
    fireEvent.input(screen.getByLabelText('Email'), { target: { value: 'admin@clinic.com' } });
    fireEvent.input(screen.getByLabelText('Contrasena'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /iniciar sesion/i }));
    await waitFor(() => {
      expect(screen.getByText('Credenciales incorrectas')).toBeInTheDocument();
    });
  });

  it('displays generic error message when error has no response data', async () => {
    mockLogin.mockRejectedValue(new Error('Network error'));
    renderLoginPage();
    fireEvent.input(screen.getByLabelText('Email'), { target: { value: 'admin@clinic.com' } });
    fireEvent.input(screen.getByLabelText('Contrasena'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /iniciar sesion/i }));
    await waitFor(() => {
      expect(screen.getByText('Error al iniciar sesion')).toBeInTheDocument();
    });
  });

  it('disables the submit button while submitting', async () => {
    mockLogin.mockImplementation(() => new Promise(() => {}));
    const { container } = renderLoginPage();
    fireEvent.input(screen.getByLabelText('Email'), { target: { value: 'admin@clinic.com' } });
    fireEvent.input(screen.getByLabelText('Contrasena'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /iniciar sesion/i }));
    await waitFor(() => {
      const submitButton = container.querySelector('button[type="submit"]');
      expect(submitButton).toBeDisabled();
    });
  });

  it('toggles password visibility when eye icon is clicked', () => {
    renderLoginPage();
    const passwordInput = screen.getByLabelText('Contrasena');
    expect(passwordInput).toHaveAttribute('type', 'password');
    const toggleButton = screen.getByRole('button', { name: /mostrar contraseña/i });
    fireEvent.click(toggleButton);
    expect(screen.getByLabelText('Contrasena')).toHaveAttribute('type', 'text');
  });
});
