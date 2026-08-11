import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AppThemeProvider } from '@/shared/providers/ThemeProvider';
import ForgotPasswordPage from '@/modules/auth/pages/ForgotPasswordPage';

const mockPost = vi.hoisted(() => vi.fn());

vi.mock('@/shared/services/api-client', () => ({
  apiClient: { post: mockPost },
}));

vi.mock('react-i18next', () => {
  const translations: Record<string, string> = {
    'forgot_password:title': '¿Olvidaste tu contraseña?',
    'forgot_password:subtitle': 'Ingresa tu correo electrónico y te enviaremos las instrucciones para restablecerla.',
    'forgot_password:email': 'Correo electrónico',
    'forgot_password:submit': 'Enviar instrucciones',
    'forgot_password:back': 'Volver',
    'forgot_password:error': 'Error al enviar el correo. Intenta de nuevo.',
    'forgot_password:sent_title': 'Correo enviado',
    'forgot_password:sent_message': 'Si existe una cuenta con ese correo, recibirás instrucciones para restablecer tu contraseña.',
    'forgot_password:back_login': 'Volver al inicio de sesión',
  };
  const t = (key: string) => translations[key] ?? key;
  return {
    useTranslation: () => ({
      t,
      i18n: { language: 'es' },
    }),
  };
});

function renderPage() {
  return render(
    <MemoryRouter>
      <AppThemeProvider>
        <ForgotPasswordPage />
      </AppThemeProvider>
    </MemoryRouter>,
  );
}

describe('ForgotPasswordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the forgot password form', () => {
    renderPage();
    expect(screen.getByText('¿Olvidaste tu contraseña?')).toBeInTheDocument();
    expect(screen.getByLabelText(/Correo electrónico/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enviar instrucciones' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Volver' })).toBeInTheDocument();
  });

  it('does not call the API when email is empty', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Enviar instrucciones' }));
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('shows success view after sending the reset email', async () => {
    mockPost.mockResolvedValue({ data: {} });
    renderPage();
    fireEvent.input(screen.getByLabelText(/Correo electrónico/), {
      target: { value: 'user@clinic.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar instrucciones' }));
    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith('/auth/forgot-password', { email: 'user@clinic.com' });
    });
    expect(await screen.findByText('Correo enviado')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Volver al inicio de sesión' })).toBeInTheDocument();
  });

  it('shows an error alert when the API call fails', async () => {
    mockPost.mockRejectedValue(new Error('Network error'));
    renderPage();
    fireEvent.input(screen.getByLabelText(/Correo electrónico/), {
      target: { value: 'user@clinic.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar instrucciones' }));
    await waitFor(() => {
      expect(screen.getByText('Error al enviar el correo. Intenta de nuevo.')).toBeInTheDocument();
    });
  });
});
