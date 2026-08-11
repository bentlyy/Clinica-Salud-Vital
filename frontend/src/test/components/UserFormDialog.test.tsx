import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppThemeProvider } from '@/shared/providers/ThemeProvider';
import { UserFormDialog } from '@/modules/users/components/UserFormDialog';

vi.mock('@/i18n/i18n', () => ({
  default: { language: 'es', on: vi.fn() },
}));

vi.mock('react-i18next', () => ({
  useTranslation: (ns?: string) => {
    const users: Record<string, string> = {
      newUser: 'Nuevo Usuario',
      create_user_subtitle: 'Crea un doctor o invita a una persona',
      fullName: 'Nombre completo',
      role: 'Rol',
      specialty: 'Especialidad',
      rut: 'RUT',
      phone_optional: 'Teléfono (opcional)',
      invite_explainer: 'Se enviará una invitación por correo electrónico.',
      saving: 'Guardando...',
      createUser: 'Crear Usuario',
      sendInvite: 'Enviar invitación',
      name_min_length: 'El nombre debe tener al menos 2 caracteres',
      invalid_email: 'Ingresa un email válido',
      specialty_required: 'La especialidad es obligatoria',
    };
    const common: Record<string, string> = {
      email: 'Email',
      cancel: 'Cancelar',
    };
    const translations = ns === 'common' ? common : users;
    return {
      t: (key: string) => translations[key] ?? key,
      i18n: { language: 'es' },
    };
  },
}));

function renderDialog(props: Partial<React.ComponentProps<typeof UserFormDialog>> = {}) {
  const onClose = vi.fn();
  const onSubmit = vi.fn();
  render(
    <AppThemeProvider>
      <UserFormDialog
        open
        onClose={onClose}
        onSubmit={onSubmit}
        isPending={false}
        {...props}
      />
    </AppThemeProvider>,
  );
  return { onClose, onSubmit };
}

function fillDoctorForm() {
  fireEvent.change(screen.getByLabelText('Nombre completo'), { target: { value: 'Ana Pérez' } });
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ana@clinic.cl' } });
  fireEvent.change(screen.getByLabelText('Especialidad'), { target: { value: 'Cardiología' } });
  fireEvent.change(screen.getByLabelText('RUT'), { target: { value: '11.111.111-1' } });
}

describe('UserFormDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders title and doctor fields by default, without invite alert', () => {
    renderDialog();
    expect(screen.getByText('Nuevo Usuario')).toBeInTheDocument();
    expect(screen.getByLabelText('Nombre completo')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Especialidad')).toBeInTheDocument();
    expect(screen.getByLabelText('RUT')).toBeInTheDocument();
    expect(screen.getByLabelText('Teléfono (opcional)')).toBeInTheDocument();
    expect(screen.queryByText('Se enviará una invitación por correo electrónico.')).not.toBeInTheDocument();
  });

  it('submits a doctor payload when all fields are valid', async () => {
    const { onSubmit } = renderDialog();
    fillDoctorForm();
    fireEvent.click(screen.getByRole('button', { name: 'Crear Usuario' }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        name: 'Ana Pérez',
        email: 'ana@clinic.cl',
        role: 'doctor',
        specialty: 'Cardiología',
        rut: '11.111.111-1',
        phone: undefined,
      }),
    );
  });

  it('shows validation errors when submitting an empty form', async () => {
    const { onSubmit } = renderDialog();
    fireEvent.click(screen.getByRole('button', { name: 'Crear Usuario' }));

    expect(
      await screen.findByText('El nombre debe tener al menos 2 caracteres'),
    ).toBeInTheDocument();
    expect(screen.getByText('Ingresa un email válido')).toBeInTheDocument();
    expect(screen.getByText('La especialidad es obligatoria')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('switches to invite mode: hides doctor fields, shows explainer and sends invite payload', async () => {
    const { onSubmit } = renderDialog();

    fireEvent.mouseDown(screen.getByLabelText('Rol'));
    const patientOption = await screen.findByRole('option', { name: 'Paciente' });
    fireEvent.click(patientOption);

    expect(screen.queryByLabelText('Especialidad')).not.toBeInTheDocument();
    expect(screen.getByText('Se enviará una invitación por correo electrónico.')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Nombre completo'), { target: { value: 'Juan Soto' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'juan@clinic.cl' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar invitación' }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        name: 'Juan Soto',
        email: 'juan@clinic.cl',
        role: 'patient',
        specialty: undefined,
        rut: undefined,
        phone: undefined,
      }),
    );
  });

  it('disables actions and shows saving label while pending', () => {
    renderDialog({ isPending: true });
    expect(screen.getByText('Guardando...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
  });

  it('calls onClose when cancel is clicked', () => {
    const { onClose } = renderDialog();
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
