import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AppThemeProvider } from '@/shared/providers/ThemeProvider';
import { SpecialtyFormModal } from '@/modules/specialties/components/SpecialtyFormModal';
import type { Specialty } from '@/modules/specialties/types/specialty.types';
import type { Tenant } from '@/modules/super-admin/types/super-admin.types';

vi.mock('react-i18next', () => {
  const specialties: Record<string, string> = {
    newSpecialty: 'Nueva Especialidad',
    editSpecialty: 'Editar Especialidad',
    nameRequired: 'El nombre es obligatorio',
    clinicRequired: 'Selecciona una clínica',
    descriptionOptional: 'Descripción (opcional)',
    icon: 'Icono',
    iconHelper: 'Máximo 4 caracteres',
    departmentLabel: 'Departamento',
    departmentHelper: 'Ej: Cardiología',
    colorLabel: 'Color',
    proceduresLabel: 'Procedimientos',
    proceduresHelper: 'Escribe y presiona Enter',
    saving: 'Guardando...',
    updating: 'Actualizar',
    clinicLabel: 'Clínica',
  };
  const common: Record<string, string> = {
    name: 'Nombre',
    add: 'Agregar',
    cancel: 'Cancelar',
    create: 'Crear',
  };
  return {
    useTranslation: (ns?: string) => ({
      t: (key: string) => (ns === 'common' ? common : specialties)[key] ?? key,
      i18n: { language: 'es' },
    }),
  };
});

const clinics = [
  { id: 't1', name: 'Clínica Norte', active: true, plan: 'premium' },
  { id: 't2', name: 'Clínica Sur', active: true, plan: 'premium' },
] as Tenant[];

const editingSpecialty: Specialty = {
  id: 1,
  tenant_id: 't2',
  name: 'Cardiología',
  description: 'Cuidado del corazón',
  icon: '🫀',
  color: '#7c3aed',
  procedures: ['Consulta', 'Control'],
  created_at: '2026-01-01T00:00:00Z',
};

function renderModal(overrides: Partial<React.ComponentProps<typeof SpecialtyFormModal>> = {}) {
  const props = {
    open: true,
    editing: null,
    clinics,
    isSuperAdmin: false,
    defaultTenantId: 't1',
    isPending: false,
    onClose: vi.fn(),
    onSubmit: vi.fn(),
    ...overrides,
  };
  return { props, ...render(
    <AppThemeProvider>
      <SpecialtyFormModal {...props} />
    </AppThemeProvider>,
  ) };
}

describe('SpecialtyFormModal', () => {
  it('renders the create dialog with defaults', () => {
    renderModal();
    expect(screen.getByText('Nueva Especialidad')).toBeInTheDocument();
    expect(screen.getByLabelText('Nombre')).toHaveValue('');
    expect(screen.getByDisplayValue('🩺')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Crear' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Clínica')).not.toBeInTheDocument();
  });

  it('submits the form with the filled data and added procedures', async () => {
    const { props } = renderModal();
    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Cardiología' } });
    const procedureInput = screen.getByPlaceholderText('Escribe y presiona Enter');
    fireEvent.change(procedureInput, { target: { value: 'Consulta' } });
    fireEvent.keyDown(procedureInput, { key: 'Enter' });
    expect(screen.getByText('Consulta')).toBeInTheDocument(); // chip

    fireEvent.click(screen.getByRole('button', { name: 'Crear' }));

    await waitFor(() => expect(props.onSubmit).toHaveBeenCalledTimes(1));
    expect(props.onSubmit).toHaveBeenCalledWith({
      name: 'Cardiología',
      description: undefined,
      icon: '🩺',
      department: undefined,
      color: '#0d9488',
      procedures: ['Consulta'],
      tenantId: undefined,
    });
  });

  it('shows a validation error for an empty name', async () => {
    const { props } = renderModal();
    fireEvent.click(screen.getByRole('button', { name: 'Crear' }));
    expect(await screen.findByText('El nombre es obligatorio')).toBeInTheDocument();
    expect(props.onSubmit).not.toHaveBeenCalled();
  });

  it('pre-fills the fields when editing and submits the updated values', async () => {
    const { props } = renderModal({ editing: editingSpecialty, isSuperAdmin: true, defaultTenantId: 't1' });
    expect(screen.getByText('Editar Especialidad')).toBeInTheDocument();
    expect(screen.getByLabelText('Nombre')).toHaveValue('Cardiología');
    expect(screen.getByLabelText('Descripción (opcional)')).toHaveValue('Cuidado del corazón');
    expect(screen.getByText('Consulta')).toBeInTheDocument();
    expect(screen.getByText('Control')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Actualizar' }));

    await waitFor(() => expect(props.onSubmit).toHaveBeenCalledTimes(1));
    expect(props.onSubmit).toHaveBeenCalledWith({
      name: 'Cardiología',
      description: 'Cuidado del corazón',
      icon: '🫀',
      department: undefined,
      color: '#7c3aed',
      procedures: ['Consulta', 'Control'],
      tenantId: 't2',
    });
  });

  it('renders the clinic selector for super admins and submits the selected tenant', async () => {
    const { props } = renderModal({ isSuperAdmin: true, defaultTenantId: '' });
    expect(screen.getByRole('combobox')).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByRole('combobox'));
    fireEvent.click(screen.getByText('Clínica Norte'));
    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Dermatología' } });
    fireEvent.click(screen.getByRole('button', { name: 'Crear' }));

    await waitFor(() => expect(props.onSubmit).toHaveBeenCalledTimes(1));
    expect(props.onSubmit).toHaveBeenCalledWith(expect.objectContaining({ tenantId: 't1' }));
  });

  it('requires a clinic for super admins', async () => {
    const { props } = renderModal({ isSuperAdmin: true, defaultTenantId: '' });
    fireEvent.click(screen.getByRole('button', { name: 'Crear' }));
    expect(await screen.findByText('Selecciona una clínica')).toBeInTheDocument();
    expect(props.onSubmit).not.toHaveBeenCalled();
  });

  it('shows the saving state while pending', () => {
    renderModal({ isPending: true });
    expect(screen.getByRole('button', { name: 'Guardando...' })).toBeDisabled();
  });

  it('closes the dialog with the cancel button', () => {
    const { props } = renderModal();
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });
});
