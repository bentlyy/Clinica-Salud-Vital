import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppThemeProvider } from '@/shared/providers/ThemeProvider';
import TwoFAPage from '@/modules/2fa/pages/TwoFAPage';

const auth = vi.hoisted(() => ({ useAuth: vi.fn() }));
const router = vi.hoisted(() => ({ useNavigate: vi.fn() }));

vi.mock('@/shared/providers/AuthProvider', () => auth);
vi.mock('react-router-dom', () => router);

vi.mock('react-i18next', () => {
  const translations: Record<string, string> = {
    'two_fa:title': 'Verificación en Dos Pasos',
    'two_fa:description': 'Ingresa el código de 6 dígitos de tu aplicación de autenticación.',
    'two_fa:verify': 'Verificar',
    'two_fa:invalid_code': 'Código inválido. Intenta de nuevo.',
    'two_fa:back': 'Volver',
  };
  return {
    useTranslation: () => ({
      t: (key: string, defaultValue?: string) => translations[key] ?? defaultValue ?? key,
      i18n: { language: 'es' },
    }),
  };
});

function renderPage() {
  return render(
    <AppThemeProvider>
      <TwoFAPage />
    </AppThemeProvider>,
  );
}

describe('TwoFAPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    router.useNavigate.mockReturnValue(vi.fn());
  });

  it('renders the title, description and a disabled verify button', () => {
    auth.useAuth.mockReturnValue({ login: vi.fn() });
    renderPage();
    expect(screen.getByText('Verificación en Dos Pasos')).toBeInTheDocument();
    expect(screen.getByText(/Ingresa el código de 6 dígitos/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Verificar' })).toBeDisabled();
  });

  it('enables the button with a 6-digit code and submits the login flow', async () => {
    const login = vi.fn().mockResolvedValue(undefined);
    const navigate = vi.fn();
    auth.useAuth.mockReturnValue({ login });
    router.useNavigate.mockReturnValue(navigate);
    renderPage();

    const input = screen.getByPlaceholderText('000000');
    fireEvent.change(input, { target: { value: '123456' } });
    expect(screen.getByRole('button', { name: 'Verificar' })).toBeEnabled();

    fireEvent.click(screen.getByRole('button', { name: 'Verificar' }));
    await waitFor(() => expect(login).toHaveBeenCalledWith('', '', '123456'));
    expect(navigate).toHaveBeenCalledWith('/dashboard');
  });

  it('strips non-digits and limits the input to 6 characters', () => {
    auth.useAuth.mockReturnValue({ login: vi.fn() });
    renderPage();
    const input = screen.getByPlaceholderText('000000');
    fireEvent.change(input, { target: { value: '12a3456x78' } });
    expect((input as HTMLInputElement).value).toBe('123456');
  });

  it('shows the invalid code error when login rejects', async () => {
    const login = vi.fn().mockRejectedValue(new Error('bad code'));
    auth.useAuth.mockReturnValue({ login });
    renderPage();

    fireEvent.change(screen.getByPlaceholderText('000000'), { target: { value: '000000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Verificar' }));
    expect(await screen.findByText('Código inválido. Intenta de nuevo.')).toBeInTheDocument();
  });

  it('navigates back to the home page', () => {
    const navigate = vi.fn();
    auth.useAuth.mockReturnValue({ login: vi.fn() });
    router.useNavigate.mockReturnValue(navigate);
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Volver' }));
    expect(navigate).toHaveBeenCalledWith('/');
  });
});
