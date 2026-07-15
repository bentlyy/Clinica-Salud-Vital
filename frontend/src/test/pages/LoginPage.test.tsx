import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockNavigate = vi.fn();
let mockSearchParams = new URLSearchParams();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useSearchParams: () => [mockSearchParams, vi.fn()],
  };
});

const mockLogin = vi.fn();

vi.mock('../../context/useAuth', () => ({
  useAuth: () => ({ login: mockLogin }),
}));

vi.mock('../../i18n/useI18n', () => ({
  useI18n: () => ({
    t: (key) => {
      const map = {
        'auth.login_title': 'Iniciar Sesión',
        'auth.login_subtitle': 'Ingresa tus credenciales',
        'auth.email': 'Correo electrónico',
        'auth.email_placeholder': 'tu@correo.com',
        'auth.password': 'Contraseña',
        'auth.password_placeholder': '••••••••',
        'auth.email_required': 'El correo es requerido',
        'auth.password_required': 'La contraseña es requerida',
        'auth.captcha_required': 'Completa el CAPTCHA',
        'auth.login_button': 'Iniciar Sesión',
        'auth.logging_in': 'Ingresando...',
        'auth.verify_2fa': 'Verificar 2FA',
        'auth.invalid_credentials': 'Credenciales inválidas',
        'auth.totp_code': 'Código 2FA',
        'auth.totp_placeholder': 'Ingresa tu código',
        'auth.no_account': '¿No tienes cuenta?',
        'auth.register_link': 'Regístrate aquí',
      };
      return map[key] || key;
    },
  }),
}));

vi.mock('react-google-recaptcha', () => ({
  default: ({ sitekey }) => (
    <div data-testid="mock-recaptcha" data-sitekey={sitekey} />
  ),
}));

vi.mock('axios', () => ({
  default: { isAxiosError: (err: unknown) => !!err && typeof err === 'object' && 'response' in err },
  isAxiosError: (err: unknown) => !!err && typeof err === 'object' && 'response' in err,
}));

vi.mock('../../utils/error-sanitizer', () => ({
  sanitizeError: (err: unknown) => {
    if (err && typeof err === 'object' && 'response' in err) {
      const r = (err as { response?: { data?: { error?: string } } }).response;
      return r?.data?.error || String(err);
    }
    return String(err);
  },
}));

function renderLoginPage() {
  return render(
    <BrowserRouter>
      <LoginPage />
    </BrowserRouter>
  );
}

import LoginPage from '../../pages/LoginPage';

function submitForm() {
  const form = document.querySelector('form');
  if (form) fireEvent.submit(form);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockNavigate.mockClear();
  mockSearchParams = new URLSearchParams();
});

describe('LoginPage', () => {
  it('renders login form with title and fields', () => {
    renderLoginPage();
    expect(screen.getByRole('heading', { name: 'Iniciar Sesión' })).toBeInTheDocument();
    expect(screen.getByText('Ingresa tus credenciales')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('tu@correo.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Iniciar Sesión' })).toBeInTheDocument();
  });

  it('shows validation error when email is empty', async () => {
    renderLoginPage();
    submitForm();
    await waitFor(() => {
      expect(screen.getByText('El correo es requerido')).toBeInTheDocument();
    });
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('shows validation error when password is empty', async () => {
    renderLoginPage();
    fireEvent.change(screen.getByPlaceholderText('tu@correo.com'), { target: { value: 'test@test.com' } });
    submitForm();
    await waitFor(() => {
      expect(screen.getByText('La contraseña es requerida')).toBeInTheDocument();
    });
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('calls login with email and password on submit', async () => {
    mockLogin.mockResolvedValue({ role: 'patient' });
    renderLoginPage();
    fireEvent.change(screen.getByPlaceholderText('tu@correo.com'), { target: { value: 'test@test.com' } });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'secret' } });
    submitForm();
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('test@test.com', 'secret', undefined, undefined, null);
    });
  });

  it('navigates to /super-admin/demo-data for superadmin role', async () => {
    mockLogin.mockResolvedValue({ role: 'superadmin' });
    renderLoginPage();
    fireEvent.change(screen.getByPlaceholderText('tu@correo.com'), { target: { value: 'admin@test.com' } });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'pass' } });
    submitForm();
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/super-admin/demo-data');
    });
  });

  it('navigates to / for admin role', async () => {
    mockLogin.mockResolvedValue({ role: 'admin' });
    renderLoginPage();
    fireEvent.change(screen.getByPlaceholderText('tu@correo.com'), { target: { value: 'admin@test.com' } });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'pass' } });
    submitForm();
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  it('navigates to /doctor for doctor role', async () => {
    mockLogin.mockResolvedValue({ role: 'doctor' });
    renderLoginPage();
    fireEvent.change(screen.getByPlaceholderText('tu@correo.com'), { target: { value: 'doc@test.com' } });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'pass' } });
    submitForm();
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/doctor');
    });
  });

  it('navigates to /lab for lab_technician role', async () => {
    mockLogin.mockResolvedValue({ role: 'lab_technician' });
    renderLoginPage();
    fireEvent.change(screen.getByPlaceholderText('tu@correo.com'), { target: { value: 'lab@test.com' } });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'pass' } });
    submitForm();
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/lab');
    });
  });

  it('navigates to /booking for patient role', async () => {
    mockLogin.mockResolvedValue({ role: 'patient' });
    renderLoginPage();
    fireEvent.change(screen.getByPlaceholderText('tu@correo.com'), { target: { value: 'pat@test.com' } });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'pass' } });
    submitForm();
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/booking');
    });
  });

  it('navigates to redirect param if present', async () => {
    mockSearchParams = new URLSearchParams('redirect=/admin/users');
    mockLogin.mockResolvedValue({ role: 'patient' });
    renderLoginPage();
    fireEvent.change(screen.getByPlaceholderText('tu@correo.com'), { target: { value: 'pat@test.com' } });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'pass' } });
    submitForm();
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/admin/users');
    });
  });

  it('shows error message on login failure', async () => {
    mockLogin.mockRejectedValue({ response: { data: { error: 'Credenciales inválidas' } } });
    renderLoginPage();
    fireEvent.change(screen.getByPlaceholderText('tu@correo.com'), { target: { value: 'bad@test.com' } });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'wrong' } });
    submitForm();
    await waitFor(() => {
      expect(screen.getByText('Credenciales inválidas')).toBeInTheDocument();
    });
  });

  it('shows 2FA input when 2FA is required', async () => {
    mockLogin.mockRejectedValue({ response: { data: { code: '2FA_REQUIRED' } } });
    renderLoginPage();
    fireEvent.change(screen.getByPlaceholderText('tu@correo.com'), { target: { value: 'test@test.com' } });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'pass' } });
    submitForm();
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Ingresa tu código')).toBeInTheDocument();
    });
    expect(screen.getByText('Verificar 2FA')).toBeInTheDocument();
  });

  it('calls login with totp_token when 2FA is active', async () => {
    mockLogin
      .mockRejectedValueOnce({ response: { data: { code: '2FA_REQUIRED' } } })
      .mockResolvedValueOnce({ role: 'patient' });

    renderLoginPage();
    fireEvent.change(screen.getByPlaceholderText('tu@correo.com'), { target: { value: 'test@test.com' } });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'pass' } });
    submitForm();

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Ingresa tu código')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText('Ingresa tu código'), { target: { value: '123456' } });
    submitForm();

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('test@test.com', 'pass', '123456', undefined, null);
    });
  });

  it('shows tenant register link when tenant param is present', () => {
    mockSearchParams = new URLSearchParams('tenant=test-tenant');
    renderLoginPage();
    expect(screen.getByText('¿No tienes cuenta?')).toBeInTheDocument();
    expect(screen.getByText('Regístrate aquí')).toHaveAttribute('href', '/register?tenant=test-tenant');
  });

  it('shows register link without tenant param (links to /register)', () => {
    renderLoginPage();
    expect(screen.getByText('¿No tienes cuenta?')).toBeInTheDocument();
    expect(screen.getByText('Regístrate aquí')).toHaveAttribute('href', '/register');
  });

  it('shows submitting state on button when logging in', async () => {
    mockLogin.mockImplementation(() => new Promise(() => {}));
    renderLoginPage();
    fireEvent.change(screen.getByPlaceholderText('tu@correo.com'), { target: { value: 'test@test.com' } });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'pass' } });
    submitForm();
    await waitFor(() => {
      const btn = screen.getByRole('button', { name: /Ingresando/ });
      expect(btn).toBeDisabled();
    });
  });

  it('handles error with sanitized message when no data.error', async () => {
    mockLogin.mockRejectedValue({ response: { data: {} } });
    renderLoginPage();
    fireEvent.change(screen.getByPlaceholderText('tu@correo.com'), { target: { value: 'test@test.com' } });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'pass' } });
    submitForm();
    await waitFor(() => {
      expect(screen.getByText('[object Object]')).toBeInTheDocument();
    });
  });

  it('handles login error with 2FA token required message', async () => {
    mockLogin.mockRejectedValue({ response: { data: { error: '2FA token required' } } });
    renderLoginPage();
    fireEvent.change(screen.getByPlaceholderText('tu@correo.com'), { target: { value: 'test@test.com' } });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'pass' } });
    submitForm();
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Ingresa tu código')).toBeInTheDocument();
    });
  });
});
