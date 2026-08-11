import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AppThemeProvider } from '@/shared/providers/ThemeProvider';
import { DoctorFormDialog } from '@/modules/doctors/components/DoctorFormDialog';
import type { Doctor } from '@/modules/doctors/types/doctor.types';

const doctor: Doctor = {
  id: 1,
  user_id: 10,
  name: 'Juan Perez',
  email: 'juan@clinic.com',
  specialty: 'Cardiología',
  license_number: 'LIC-123',
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
};

function renderDialog(overrides: {
  doctor?: Doctor | null;
  onSubmit?: (d: unknown) => void;
  isPending?: boolean;
  open?: boolean;
} = {}) {
  const { doctor: doc = null, onSubmit = vi.fn(), isPending = false, open = true } = overrides;
  render(
    <AppThemeProvider>
      <DoctorFormDialog
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

describe('DoctorFormDialog', () => {
  it('renders nothing when closed', () => {
    renderDialog({ open: false });
    expect(screen.queryByText('newDoctor')).not.toBeInTheDocument();
  });

  it('shows the create title for a new doctor', () => {
    renderDialog();
    expect(screen.getByText('newDoctor')).toBeInTheDocument();
    expect(screen.getByText('create_subtitle')).toBeInTheDocument();
  });

  it('shows the edit title and prefilled values for an existing doctor', async () => {
    renderDialog({ doctor });
    expect(screen.getByText('editDoctor')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText('full_name')).toHaveValue('Juan Perez'));
    await waitFor(() => expect(screen.getByLabelText('Email')).toHaveValue('juan@clinic.com'));
    expect(screen.getByLabelText('Email')).toBeDisabled();
  });

  it('submits the form data when valid', async () => {
    const { onSubmit } = renderDialog();

    fireEvent.change(screen.getByLabelText('full_name'), { target: { value: 'Ana Torres' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ana@clinic.com' } });
    fireEvent.change(screen.getByLabelText('specialty'), { target: { value: 'Dermatología' } });
    fireEvent.change(screen.getByLabelText('license_number'), { target: { value: 'LIC-999' } });
    fireEvent.change(screen.getByLabelText('phone'), { target: { value: '+56 9 1234 5678' } });
    fireEvent.change(screen.getByLabelText('consultation_fee'), { target: { value: '100' } });
    fireEvent.change(screen.getByLabelText('bio'), { target: { value: 'Especialista' } });

    fireEvent.click(screen.getByRole('button', { name: 'create_doctor' }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        name: 'Ana Torres',
        email: 'ana@clinic.com',
        specialty_id: undefined,
        license_number: 'LIC-999',
        phone: '+56 9 1234 5678',
        bio: 'Especialista',
        consultation_fee: 100,
      });
    });
  });

  it('shows validation errors and does not submit when invalid', async () => {
    const { onSubmit } = renderDialog();

    // 'A' passes HTML5 constraint validation but fails zod min(2);
    // an empty email fails zod .email() while being HTML5-valid (not required).
    fireEvent.change(screen.getByLabelText('full_name'), { target: { value: 'A' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'create_doctor' }));

    await waitFor(() => {
      expect(screen.getByText('name_min_length')).toBeInTheDocument();
      expect(screen.getByText('invalid_email')).toBeInTheDocument();
    });
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
