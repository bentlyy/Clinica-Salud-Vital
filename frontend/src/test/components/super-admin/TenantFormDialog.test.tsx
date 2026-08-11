import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AppThemeProvider } from '@/shared/providers/ThemeProvider';
import { TenantFormDialog } from '@/modules/super-admin/components/TenantFormDialog';
import type { Tenant } from '@/modules/super-admin/types/super-admin.types';

const tenant: Tenant = {
  id: 't1',
  name: 'Clínica Norte',
  slug: 'clinica-norte',
  domain: 'norte.clinic.com',
  active: true,
  plan: 'pro',
  total_bookings: 12,
  total_users: 5,
  total_doctors: 2,
  created_at: '2026-01-01T00:00:00Z',
};

function renderDialog(overrides: {
  open?: boolean;
  tenant?: Tenant | null;
  onSubmit?: (d: unknown) => void;
  isPending?: boolean;
} = {}) {
  const { open = true, tenant: ten = null, onSubmit = vi.fn(), isPending = false } = overrides;
  render(
    <AppThemeProvider>
      <TenantFormDialog
        open={open}
        tenant={ten}
        onClose={vi.fn()}
        onSubmit={onSubmit}
        isPending={isPending}
      />
    </AppThemeProvider>,
  );
  return { onSubmit };
}

describe('TenantFormDialog', () => {
  it('renders nothing when closed', () => {
    renderDialog({ open: false });
    expect(screen.queryByText(/Nueva Cl/)).not.toBeInTheDocument();
  });

  it('shows the create title, name/domain fields and the plan selector', () => {
    renderDialog();
    expect(screen.getByText(/Nueva Cl/)).toBeInTheDocument();
    expect(screen.getByLabelText('Nombre')).toBeInTheDocument();
    expect(screen.getByLabelText('Dominio (opcional)')).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Crear' })).toBeInTheDocument();
  });

  it('submits the default free plan when only name and domain are filled', async () => {
    const { onSubmit } = renderDialog();
    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Clínica Sur' } });
    fireEvent.change(screen.getByLabelText('Dominio (opcional)'), { target: { value: 'sur.clinic.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Crear' }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        name: 'Clínica Sur',
        domain: 'sur.clinic.com',
        plan: 'free',
      });
    });
  });

  it('submits the selected plan from the dropdown', async () => {
    const { onSubmit } = renderDialog();
    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Clínica Sur' } });

    fireEvent.mouseDown(screen.getByRole('combobox'));
    fireEvent.click(await screen.findByRole('option', { name: 'planPro' }));

    fireEvent.click(screen.getByRole('button', { name: 'Crear' }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        name: 'Clínica Sur',
        domain: '',
        plan: 'pro',
      });
    });
  });

  it('shows a validation error and does not submit when the name is too short', async () => {
    const { onSubmit } = renderDialog();
    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'A' } });
    fireEvent.click(screen.getByRole('button', { name: 'Crear' }));

    expect(await screen.findByText(/al menos 2 caracteres/)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('shows the edit title with prefilled values and no plan selector', async () => {
    renderDialog({ tenant });
    expect(screen.getByText(/Editar Cl/)).toBeInTheDocument();
    expect(screen.getByLabelText('Nombre')).toHaveValue('Clínica Norte');
    expect(screen.getByLabelText('Dominio (opcional)')).toHaveValue('norte.clinic.com');
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Actualizar' })).toBeInTheDocument();
  });

  it('submits the edit payload without the plan field', async () => {
    const { onSubmit } = renderDialog({ tenant });
    fireEvent.click(screen.getByRole('button', { name: 'Actualizar' }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        name: 'Clínica Norte',
        domain: 'norte.clinic.com',
      });
    });
  });

  it('disables the submit button and shows the saving label while pending', () => {
    renderDialog({ isPending: true });
    expect(screen.getByText('Guardando...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Guardando...' })).toBeDisabled();
  });
});
