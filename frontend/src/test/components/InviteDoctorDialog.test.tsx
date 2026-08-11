import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AppThemeProvider } from '@/shared/providers/ThemeProvider';
import { InviteDoctorDialog } from '@/modules/doctors/components/InviteDoctorDialog';
import type { Doctor } from '@/modules/doctors/types/doctor.types';

const doctor: Doctor = {
  id: 3,
  user_id: 30,
  name: 'Juan Perez',
  email: 'juan@clinic.com',
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
};

function renderDialog(overrides: {
  open?: boolean;
  doctor?: Doctor | null;
  onSubmit?: (d: unknown) => void;
  isPending?: boolean;
} = {}) {
  const { open = true, doctor: doc = doctor, onSubmit = vi.fn(), isPending = false } = overrides;
  render(
    <AppThemeProvider>
      <InviteDoctorDialog
        open={open}
        onClose={vi.fn()}
        doctor={doc}
        onSubmit={onSubmit}
        isPending={isPending}
      />
    </AppThemeProvider>,
  );
  return { onSubmit };
}

describe('InviteDoctorDialog', () => {
  it('renders nothing when closed', () => {
    renderDialog({ open: false });
    expect(screen.queryByLabelText('Email del doctor')).not.toBeInTheDocument();
  });

  it('shows the doctor name and prefills the email', () => {
    renderDialog();
    expect(screen.getByText('Dr. Juan Perez')).toBeInTheDocument();
    expect(screen.getByLabelText('Email del doctor')).toHaveValue('juan@clinic.com');
  });

  it('submits the doctor id and email', async () => {
    const { onSubmit } = renderDialog();

    fireEvent.click(screen.getByRole('button', { name: /Enviar/ }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({ id: 3, email: 'juan@clinic.com' });
    });
  });

  it('shows a validation error for an invalid email', async () => {
    const { onSubmit } = renderDialog();

    // An empty email fails zod .email() but passes HTML5 constraint validation
    // (the field is not required), so the form submit event is not blocked.
    fireEvent.change(screen.getByLabelText('Email del doctor'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: /Enviar/ }));

    await waitFor(() => {
      expect(screen.getByText('errors:invalidEmail')).toBeInTheDocument();
    });
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
