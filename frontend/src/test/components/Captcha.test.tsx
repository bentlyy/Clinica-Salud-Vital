import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';

vi.mock('../../context/useAuth', () => ({
  useAuth: () => ({ login: vi.fn() }),
}));

vi.mock('../../i18n/useI18n', () => ({
  useI18n: () => ({
    t: (key) => {
      const map = {
        'auth.login_title': 'Iniciar Sesión',
        'auth.email': 'Correo electrónico',
        'auth.email_placeholder': 'tu@correo.com',
        'auth.password': 'Contraseña',
        'auth.password_placeholder': '••••••••',
        'auth.email_required': 'El correo es requerido',
        'auth.password_required': 'La contraseña es requerida',
        'auth.captcha_required': 'Completa el CAPTCHA',
        'auth.login_button': 'Iniciar Sesión',
      };
      return map[key] || key;
    },
  }),
}));

vi.mock('react-google-recaptcha', () => ({
  default: ({ sitekey }) => <div data-testid="mock-recaptcha" data-sitekey={sitekey} />,
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => vi.fn(), useSearchParams: () => [new URLSearchParams(), vi.fn()] };
});

describe('CAPTCHA integration', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_RECAPTCHA_SITE_KEY', 'test-key');
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('renders reCAPTCHA when site key is configured', async () => {
    const LoginPage = (await import('../../pages/LoginPage')).default;
    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );
    await waitFor(() => {
      const captcha = screen.queryByTestId('mock-recaptcha');
      expect(captcha).toBeInTheDocument();
    });
  });

  it('passes site key to reCAPTCHA', async () => {
    const LoginPage = (await import('../../pages/LoginPage')).default;
    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );
    const captcha = await screen.findByTestId('mock-recaptcha');
    expect(captcha).toHaveAttribute('data-sitekey', 'test-key');
  });

  it('validates captcha on submit when key is set', async () => {
    const LoginPage = (await import('../../pages/LoginPage')).default;
    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );
    fireEvent.change(screen.getByPlaceholderText('tu@correo.com'), { target: { value: 'test@test.com' } });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'pass' } });
    const form = document.querySelector('form');
    fireEvent.submit(form);
    await waitFor(() => {
      expect(screen.getByText('Completa el CAPTCHA')).toBeInTheDocument();
    });
  });

  it('does not render reCAPTCHA when no site key', async () => {
    vi.unstubAllEnvs();
    vi.stubEnv('VITE_RECAPTCHA_SITE_KEY', '');
    vi.resetModules();
    const LoginPage = (await import('../../pages/LoginPage')).default;
    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );
    await waitFor(() => {
      expect(screen.queryByTestId('mock-recaptcha')).not.toBeInTheDocument();
    });
  });
});
