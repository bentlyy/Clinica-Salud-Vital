import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AppThemeProvider } from '@/shared/providers/ThemeProvider';
import { SecurityTab } from '@/modules/settings/components/SecurityTab';

// --- Hoisted mocks ---

const changePasswordMock = vi.hoisted(() => ({ mutate: vi.fn(), isPending: false }));
const twoFAStatusMock = vi.hoisted(() => ({ data: undefined as { enabled: boolean } | undefined, isLoading: true }));
const generateTwoFAMock = vi.hoisted(() => ({
  mutate: vi.fn((_args: unknown, opts?: { onSuccess?: () => void }) => opts?.onSuccess?.()),
  isPending: false,
  data: undefined as { qr_code: string; secret: string } | undefined,
}));
const verifyTwoFAMock = vi.hoisted(() => ({
  mutate: vi.fn((_code: string, opts?: { onSuccess?: () => void }) => opts?.onSuccess?.()),
  isPending: false,
}));
const disableTwoFAMock = vi.hoisted(() => ({ mutate: vi.fn(), isPending: false }));
const logoutAllMock = vi.hoisted(() => vi.fn());
const toastMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));

// --- Mocks ---

vi.mock('@/modules/settings/hooks/useSettings', () => ({
  useChangePassword: () => changePasswordMock,
  useSessions: () => ({ data: [], isLoading: false }),
  useRevokeSession: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('@/modules/2fa/hooks/useTwoFA', () => ({
  useTwoFAStatus: () => twoFAStatusMock,
  useGenerateTwoFA: () => generateTwoFAMock,
  useVerifyTwoFA: () => verifyTwoFAMock,
  useDisableTwoFA: () => disableTwoFAMock,
}));

vi.mock('@/shared/providers/AuthProvider', () => ({
  useAuth: () => ({ logoutAll: logoutAllMock }),
}));

vi.mock('react-hot-toast', () => ({ default: toastMock }));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        change_password: 'Cambiar contraseña',
        current_password: 'Contraseña actual',
        new_password: 'Nueva contraseña',
        confirm_new_password: 'Confirmar nueva contraseña',
        changing: 'Cambiando...',
        two_factor_auth: 'Autenticación de dos factores',
        '2fa_active_message': 'La verificación en dos pasos está activa.',
        disable_2fa: 'Desactivar 2FA',
        disabling: 'Desactivando...',
        scan_qr_code: 'Escanea el código QR',
        qrCode2fa: 'Código QR de verificación',
        secret: 'Secreto',
        enter_6_digit_code: 'Ingresa el código de 6 dígitos',
        verify: 'Verificar',
        verifying: 'Verificando...',
        '2fa_info_message': 'Protege tu cuenta con autenticación en dos pasos.',
        enable_2fa: 'Activar 2FA',
        generating: 'Generando...',
        active_sessions: 'Sesiones activas',
        revoke_sessions_warning: 'Esto cerrará todas tus sesiones activas.',
        revoke_all_sessions: 'Cerrar todas las sesiones',
        revoking: 'Cerrando sesiones...',
        sessions_revoked: 'Sesiones cerradas correctamente',
        sessions_revoke_error: 'Error al cerrar sesiones',
        password_min_length: 'Mínimo 8 caracteres',
      };
      return translations[key] ?? key;
    },
    i18n: { language: 'es' },
  }),
}));

function renderTab() {
  return render(
    <MemoryRouter>
      <AppThemeProvider>
        <SecurityTab />
      </AppThemeProvider>
    </MemoryRouter>,
  );
}

describe('SecurityTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    twoFAStatusMock.data = { enabled: false };
    twoFAStatusMock.isLoading = false;
    generateTwoFAMock.data = { qr_code: 'data:image/png;base64,QR', secret: 'ABC123' };
  });

  it('renders the password change form fields', () => {
    renderTab();
    expect(screen.getByLabelText('Contraseña actual')).toBeInTheDocument();
    expect(screen.getByLabelText('Nueva contraseña')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirmar nueva contraseña')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cambiar contraseña' })).toBeInTheDocument();
  });

  it('shows the 2FA enable button when 2FA is disabled', () => {
    renderTab();
    expect(screen.getByText('Protege tu cuenta con autenticación en dos pasos.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Activar 2FA' })).toBeInTheDocument();
  });

  it('shows the disable button and success alert when 2FA is enabled', () => {
    twoFAStatusMock.data = { enabled: true };
    renderTab();
    expect(screen.getByText('La verificación en dos pasos está activa.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Desactivar 2FA' })).toBeInTheDocument();
  });

  it('disables 2FA when the disable button is clicked', () => {
    twoFAStatusMock.data = { enabled: true };
    renderTab();
    fireEvent.click(screen.getByRole('button', { name: 'Desactivar 2FA' }));
    expect(disableTwoFAMock.mutate).toHaveBeenCalled();
  });

  it('shows the QR code after enabling 2FA', async () => {
    renderTab();
    fireEvent.click(screen.getByRole('button', { name: 'Activar 2FA' }));
    await waitFor(() => {
      expect(screen.getByText('Escanea el código QR')).toBeInTheDocument();
    });
    expect(generateTwoFAMock.mutate).toHaveBeenCalled();
  });

  it('verifies the 6-digit code to finish enabling 2FA', async () => {
    renderTab();
    fireEvent.click(screen.getByRole('button', { name: 'Activar 2FA' }));
    await waitFor(() => {
      expect(screen.getByText('Escanea el código QR')).toBeInTheDocument();
    });
    const codeInput = screen.getByPlaceholderText('000000');
    fireEvent.change(codeInput, { target: { value: '123456' } });
    const verifyButton = screen.getByRole('button', { name: 'Verificar' });
    expect(verifyButton).toBeEnabled();
    fireEvent.click(verifyButton);
    await waitFor(() => {
      expect(verifyTwoFAMock.mutate).toHaveBeenCalledWith('123456', expect.any(Object));
    });
  });

  it('calls changePassword.mutate when the form is valid', async () => {
    renderTab();
    fireEvent.input(screen.getByLabelText('Contraseña actual'), { target: { value: 'old-pass-123' } });
    fireEvent.input(screen.getByLabelText('Nueva contraseña'), { target: { value: 'new-pass-123' } });
    fireEvent.input(screen.getByLabelText('Confirmar nueva contraseña'), { target: { value: 'new-pass-123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar contraseña' }));
    await waitFor(() => {
      expect(changePasswordMock.mutate).toHaveBeenCalledWith(
        { current_password: 'old-pass-123', new_password: 'new-pass-123' },
        expect.any(Object),
      );
    });
  });

  it('revokes all sessions via logoutAll', async () => {
    logoutAllMock.mockResolvedValue(undefined);
    renderTab();
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar todas las sesiones' }));
    await waitFor(() => {
      expect(logoutAllMock).toHaveBeenCalled();
    });
    expect(toastMock.success).toHaveBeenCalled();
  });
});
