import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AppThemeProvider } from '@/shared/providers/ThemeProvider';
import RegisterPage from '@/modules/auth/pages/RegisterPage';

const mockNavigate = vi.hoisted(() => vi.fn());
const mockApiGet = vi.hoisted(() => vi.fn());
const mockApiPost = vi.hoisted(() => vi.fn());
const mockSearchParams = vi.hoisted(() => ({
  get: vi.fn(() => null),
}));

vi.mock('@/shared/services/api-client', () => ({
  apiClient: { get: mockApiGet, post: mockApiPost },
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useSearchParams: () => [mockSearchParams],
    useNavigate: () => mockNavigate,
  };
});

vi.mock('react-i18next', () => {
  const translations: Record<string, string> = {
    title: 'Crear cuenta',
    subtitle: 'Completa tus datos para activar tu acceso',
    name_label: 'Nombre completo',
    email_label: 'Correo electrónico',
    password_label: 'Contraseña',
    confirm_password_label: 'Confirmar contraseña',
    register_button: 'Crear cuenta',
    password_requirements: 'La contraseña debe tener al menos 8 caracteres, mayúsculas, minúsculas, números y símbolos.',
    name_required: 'El nombre es obligatorio',
    password_min_length: 'Mínimo 8 caracteres',
    password_need_uppercase: 'Requiere mayúscula',
    password_need_lowercase: 'Requiere minúscula',
    password_need_number: 'Requiere número',
    password_need_special: 'Requiere símbolo',
    confirm_password_required: 'Confirma la contraseña',
    passwords_dont_match: 'Las contraseñas no coinciden',
    no_token: 'Token de invitación no encontrado',
    invalid_token: 'Token de invitación inválido',
    no_invite: 'Esta página requiere un enlace de invitación.',
    verifying: 'Verificando invitación...',
    success_title: '¡Cuenta creada!',
    success_message: 'Tu cuenta fue creada exitosamente.',
    go_login: 'Ir a iniciar sesión',
    back_home: 'Volver al inicio',
    already_have_account: '¿Ya tienes cuenta?',
    login_link: 'Inicia sesión',
    role_doctor: 'Médico',
    role_lab_technician: 'Técnico de Laboratorio',
    role_patient: 'Paciente',
    register_error: 'Error al crear la cuenta',
  };
  const t = (key: string) => translations[key] ?? key;
  return {
    useTranslation: () => ({
      t,
      i18n: { language: 'es' },
    }),
  };
});

function renderRegisterPage() {
  return render(
    <MemoryRouter>
      <AppThemeProvider>
        <RegisterPage />
      </AppThemeProvider>
    </MemoryRouter>,
  );
}

describe('RegisterPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams.get.mockReturnValue(null);
  });

  it('shows warning when no invite token is present', () => {
    renderRegisterPage();
    expect(screen.getByText('Esta página requiere un enlace de invitación.')).toBeInTheDocument();
    expect(mockApiGet).not.toHaveBeenCalled();
  });

  it('shows loading state while verifying the invite token', () => {
    mockSearchParams.get.mockReturnValue('token123');
    mockApiGet.mockReturnValue(new Promise(() => {}));
    renderRegisterPage();
    expect(screen.getByText('Verificando invitación...')).toBeInTheDocument();
  });

  it('renders the registration form with invite info when token is valid', async () => {
    mockSearchParams.get.mockReturnValue('token123');
    mockApiGet.mockResolvedValue({
      data: { email: 'dr@clinic.com', name: 'Ana Torres', role: 'doctor', specialty: 'Cardiología' },
    });
    renderRegisterPage();
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Crear cuenta' })).toBeInTheDocument();
    });
    expect(screen.getByLabelText('Nombre completo')).toBeInTheDocument();
    expect(screen.getByLabelText('Correo electrónico')).toBeInTheDocument();
    expect(screen.getByLabelText('Contraseña')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirmar contraseña')).toBeInTheDocument();
    expect(screen.getByText('dr@clinic.com')).toBeInTheDocument();
    expect(screen.getByText('Médico')).toBeInTheDocument();
    expect(screen.getByText('Cardiología')).toBeInTheDocument();
  });

  it('shows error state when invite token is invalid', async () => {
    mockSearchParams.get.mockReturnValue('badtoken');
    mockApiGet.mockRejectedValue(new Error('Invalid token'));
    renderRegisterPage();
    await waitFor(() => {
      expect(screen.getByText('Token de invitación inválido')).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: 'Volver al inicio' })).toBeInTheDocument();
  });

  it('shows validation errors when submitting an empty form', async () => {
    mockSearchParams.get.mockReturnValue('token123');
    mockApiGet.mockResolvedValue({
      data: { email: 'dr@clinic.com', name: '', role: 'doctor', specialty: null },
    });
    renderRegisterPage();
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Crear cuenta' })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));
    await waitFor(() => {
      expect(screen.getByText('El nombre es obligatorio')).toBeInTheDocument();
    });
    expect(mockApiPost).not.toHaveBeenCalled();
  });

  it('shows password requirement error for a weak password', async () => {
    mockSearchParams.get.mockReturnValue('token123');
    mockApiGet.mockResolvedValue({
      data: { email: 'dr@clinic.com', name: 'Ana Torres', role: 'doctor', specialty: null },
    });
    renderRegisterPage();
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Crear cuenta' })).toBeInTheDocument();
    });
    fireEvent.input(screen.getByLabelText('Nombre completo'), { target: { value: 'Ana Torres' } });
    fireEvent.input(screen.getByLabelText('Contraseña'), { target: { value: 'short' } });
    fireEvent.input(screen.getByLabelText('Confirmar contraseña'), { target: { value: 'short' } });
    fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));
    await waitFor(() => {
      expect(screen.getByText('Mínimo 8 caracteres')).toBeInTheDocument();
    });
  });

  it('shows mismatch error when passwords do not match', async () => {
    mockSearchParams.get.mockReturnValue('token123');
    mockApiGet.mockResolvedValue({
      data: { email: 'dr@clinic.com', name: 'Ana Torres', role: 'doctor', specialty: null },
    });
    renderRegisterPage();
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Crear cuenta' })).toBeInTheDocument();
    });
    fireEvent.input(screen.getByLabelText('Nombre completo'), { target: { value: 'Ana Torres' } });
    fireEvent.input(screen.getByLabelText('Contraseña'), { target: { value: 'Str0ng!pass' } });
    fireEvent.input(screen.getByLabelText('Confirmar contraseña'), { target: { value: 'Different1!' } });
    fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));
    await waitFor(() => {
      expect(screen.getByText('Las contraseñas no coinciden')).toBeInTheDocument();
    });
  });

  it('submits the form and shows the success view', async () => {
    mockSearchParams.get.mockReturnValue('token123');
    mockApiGet.mockResolvedValue({
      data: { email: 'dr@clinic.com', name: '', role: 'doctor', specialty: null },
    });
    mockApiPost.mockResolvedValue({ data: { ok: true } });
    renderRegisterPage();
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Crear cuenta' })).toBeInTheDocument();
    });
    fireEvent.input(screen.getByLabelText('Nombre completo'), { target: { value: 'Ana Torres' } });
    fireEvent.input(screen.getByLabelText('Contraseña'), { target: { value: 'Str0ng!pass' } });
    fireEvent.input(screen.getByLabelText('Confirmar contraseña'), { target: { value: 'Str0ng!pass' } });
    fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));
    await waitFor(() => {
      expect(mockApiPost).toHaveBeenCalledWith('/auth/register', {
        email: 'dr@clinic.com',
        password: 'Str0ng!pass',
        name: 'Ana Torres',
        invite_token: 'token123',
      });
    });
    expect(await screen.findByRole('heading', { name: '¡Cuenta creada!' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ir a iniciar sesión' })).toBeInTheDocument();
  });

  it('shows API error message when registration fails', async () => {
    mockSearchParams.get.mockReturnValue('token123');
    mockApiGet.mockResolvedValue({
      data: { email: 'dr@clinic.com', name: '', role: 'doctor', specialty: null },
    });
    mockApiPost.mockRejectedValue({ response: { data: { error: 'El correo ya está registrado' } } });
    renderRegisterPage();
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Crear cuenta' })).toBeInTheDocument();
    });
    fireEvent.input(screen.getByLabelText('Nombre completo'), { target: { value: 'Ana Torres' } });
    fireEvent.input(screen.getByLabelText('Contraseña'), { target: { value: 'Str0ng!pass' } });
    fireEvent.input(screen.getByLabelText('Confirmar contraseña'), { target: { value: 'Str0ng!pass' } });
    fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));
    await waitFor(() => {
      expect(screen.getByText('El correo ya está registrado')).toBeInTheDocument();
    });
  });

  it('shows generic error message when API error has no response data', async () => {
    mockSearchParams.get.mockReturnValue('token123');
    mockApiGet.mockResolvedValue({
      data: { email: 'dr@clinic.com', name: '', role: 'doctor', specialty: null },
    });
    mockApiPost.mockRejectedValue(new Error('Network error'));
    renderRegisterPage();
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Crear cuenta' })).toBeInTheDocument();
    });
    fireEvent.input(screen.getByLabelText('Nombre completo'), { target: { value: 'Ana Torres' } });
    fireEvent.input(screen.getByLabelText('Contraseña'), { target: { value: 'Str0ng!pass' } });
    fireEvent.input(screen.getByLabelText('Confirmar contraseña'), { target: { value: 'Str0ng!pass' } });
    fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));
    await waitFor(() => {
      expect(screen.getByText('Error al crear la cuenta')).toBeInTheDocument();
    });
  });

  it('toggles password visibility when eye icon is clicked', async () => {
    mockSearchParams.get.mockReturnValue('token123');
    mockApiGet.mockResolvedValue({
      data: { email: 'dr@clinic.com', name: '', role: 'doctor', specialty: null },
    });
    renderRegisterPage();
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Crear cuenta' })).toBeInTheDocument();
    });
    const passwordInput = screen.getByLabelText('Contraseña');
    expect(passwordInput).toHaveAttribute('type', 'password');
    const toggleButtons = screen.getAllByRole('button', { name: '' });
    fireEvent.click(toggleButtons[0]);
    expect(screen.getByLabelText('Contraseña')).toHaveAttribute('type', 'text');
  });
});
