import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AppThemeProvider } from '@/shared/providers/ThemeProvider';
import ConfirmPage from '@/modules/bookings/pages/ConfirmPage';

const apiClient = vi.hoisted(() => ({ post: vi.fn() }));
const mockNavigate = vi.hoisted(() => vi.fn());
const paramsMock = vi.hoisted(() => ({ token: 'abc123' }));

vi.mock('@/shared/services/api-client', () => ({ apiClient }));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useParams: () => paramsMock, useNavigate: () => mockNavigate };
});

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => {
      const translations: Record<string, string> = {
        'confirm:confirming': 'Confirmando tu cita...',
        'confirm:success_title': '¡Cita Confirmada!',
        'confirm:success_desc': 'Tu cita ha sido confirmada exitosamente.',
        'confirm:error_title': 'Error de Confirmación',
        'confirm:error_desc': 'No se pudo confirmar la cita. El enlace puede haber expirado.',
        'confirm:already': 'Esta cita ya había sido confirmada anteriormente.',
        'confirm:title': 'Información',
        'confirm:back_home': 'Volver al inicio',
      };
      return translations[key] ?? fallback ?? key;
    },
    i18n: { language: 'es' },
  }),
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <AppThemeProvider>
        <ConfirmPage />
      </AppThemeProvider>
    </MemoryRouter>,
  );
}

describe('ConfirmPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    paramsMock.token = 'abc123';
  });

  it('shows the loading state while confirming', () => {
    apiClient.post.mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.getByText('Confirmando tu cita...')).toBeInTheDocument();
  });

  it('shows the success view when the booking is confirmed', async () => {
    apiClient.post.mockResolvedValue({ data: {} });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('¡Cita Confirmada!')).toBeInTheDocument();
    });
    expect(screen.getByText('Tu cita ha sido confirmada exitosamente.')).toBeInTheDocument();
    expect(apiClient.post).toHaveBeenCalledWith('/bookings/confirm/abc123');
  });

  it('shows the info view when the booking was already confirmed', async () => {
    apiClient.post.mockResolvedValue({ data: { alreadyConfirmed: true } });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Información')).toBeInTheDocument();
    });
    expect(screen.getByText('Esta cita ya había sido confirmada anteriormente.')).toBeInTheDocument();
  });

  it('shows the error view when the confirmation request fails', async () => {
    apiClient.post.mockRejectedValue(new Error('Network error'));
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Error de Confirmación')).toBeInTheDocument();
    });
    expect(screen.getByText('No se pudo confirmar la cita. El enlace puede haber expirado.')).toBeInTheDocument();
  });

  it('shows an error when the token is missing', async () => {
    paramsMock.token = undefined as unknown as string;
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Error de Confirmación')).toBeInTheDocument();
    });
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it('navigates back home from the success view', async () => {
    apiClient.post.mockResolvedValue({ data: {} });
    renderPage();

    const button = await screen.findByRole('button', { name: 'Volver al inicio' });
    fireEvent.click(button);
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });
});
