import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockCreateTenant = vi.fn();
vi.mock('../../api/super-admin', () => ({
  adminCreateTenant: (...args) => mockCreateTenant(...args),
}));

vi.mock('../../i18n/useI18n', () => ({
  useI18n: () => ({ t: (key) => key }),
}));

import CreateTenantModal from '../../components/CreateTenantModal';

function renderModal(props = {}) {
  return render(
    <CreateTenantModal
      isOpen={true}
      onClose={vi.fn()}
      onCreated={vi.fn()}
      {...props}
    />
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('CreateTenantModal', () => {
  it('renders form fields when open', () => {
    renderModal();
    expect(screen.getByPlaceholderText('Ej: Clínica Salud')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Ej: clinicasalud')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    const { container } = render(
      <CreateTenantModal isOpen={false} onClose={vi.fn()} onCreated={vi.fn()} />
    );
    expect(container.querySelector('.modal-overlay')).not.toBeInTheDocument();
  });

  it('shows validation errors for empty required fields', () => {
    renderModal();
    fireEvent.click(screen.getByRole('button', { name: /superadmin\.create_tenant/, hidden: true }));
    expect(screen.getByText('El nombre es obligatorio')).toBeInTheDocument();
    expect(screen.getByText('El dominio es obligatorio')).toBeInTheDocument();
  });

  it('calls adminCreateTenant on submit with valid data', async () => {
    mockCreateTenant.mockResolvedValue({ tenantId: 'new-clinic' });
    const onClose = vi.fn();
    const onCreated = vi.fn();
    renderModal({ onClose, onCreated });

    fireEvent.change(screen.getByPlaceholderText('Ej: Clínica Salud'), { target: { value: 'New Clinic' } });
    fireEvent.change(screen.getByPlaceholderText('Ej: clinicasalud'), { target: { value: 'new-clinic' } });
    fireEvent.click(screen.getByRole('button', { name: /superadmin\.create_tenant/, hidden: true }));

    await waitFor(() => {
      expect(mockCreateTenant).toHaveBeenCalled();
    });

    const callArg = mockCreateTenant.mock.calls[0][0];
    expect(callArg.name).toBe('New Clinic');
    expect(callArg.domain).toBe('new-clinic');
  });

  it('shows error message on API failure', async () => {
    mockCreateTenant.mockRejectedValue({
      response: { data: { error: 'Domain already exists' } },
    });
    renderModal();

    fireEvent.change(screen.getByPlaceholderText('Ej: Clínica Salud'), { target: { value: 'Test' } });
    fireEvent.change(screen.getByPlaceholderText('Ej: clinicasalud'), { target: { value: 'test' } });
    fireEvent.click(screen.getByRole('button', { name: /superadmin\.create_tenant/, hidden: true }));

    await waitFor(() => {
      expect(screen.getByText('Domain already exists')).toBeInTheDocument();
    });
  });

  it('shows fallback error message when no data.error', async () => {
    mockCreateTenant.mockRejectedValue(new Error('Network error'));
    renderModal();

    fireEvent.change(screen.getByPlaceholderText('Ej: Clínica Salud'), { target: { value: 'Test' } });
    fireEvent.change(screen.getByPlaceholderText('Ej: clinicasalud'), { target: { value: 'test' } });
    fireEvent.click(screen.getByRole('button', { name: /superadmin\.create_tenant/, hidden: true }));

    await waitFor(() => {
      expect(screen.getByText('Error al crear tenant')).toBeInTheDocument();
    });
  });

  it('calls onClose and onCreated on success', async () => {
    mockCreateTenant.mockResolvedValue({ tenantId: 'new-clinic' });
    const onClose = vi.fn();
    const onCreated = vi.fn();
    renderModal({ onClose, onCreated });

    fireEvent.change(screen.getByPlaceholderText('Ej: Clínica Salud'), { target: { value: 'Test' } });
    fireEvent.change(screen.getByPlaceholderText('Ej: clinicasalud'), { target: { value: 'test' } });
    fireEvent.click(screen.getByRole('button', { name: /superadmin\.create_tenant/, hidden: true }));

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
      expect(onCreated).toHaveBeenCalled();
    });
  });

  it('calls onClose when cancel button is clicked', () => {
    const onClose = vi.fn();
    renderModal({ onClose });
    fireEvent.click(screen.getByRole('button', { name: /admin\.cancel/, hidden: true }));
    expect(onClose).toHaveBeenCalled();
  });

  it('disables submit button while saving', async () => {
    mockCreateTenant.mockImplementation(() => new Promise(() => {}));
    renderModal();

    fireEvent.change(screen.getByPlaceholderText('Ej: Clínica Salud'), { target: { value: 'Test' } });
    fireEvent.change(screen.getByPlaceholderText('Ej: clinicasalud'), { target: { value: 'test' } });
    fireEvent.click(screen.getByRole('button', { name: /superadmin\.create_tenant/, hidden: true }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /superadmin\.saving/, hidden: true })).toBeDisabled();
    });
  });

  it('renders locale select with options', () => {
    renderModal();
    const options = screen.getAllByRole('option', { hidden: true });
    expect(options).toHaveLength(4);
    expect(options[0]).toHaveValue('es');
  });
});
