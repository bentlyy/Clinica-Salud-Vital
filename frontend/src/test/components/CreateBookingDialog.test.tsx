import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AppThemeProvider } from '@/shared/providers/ThemeProvider';
import { CreateBookingDialog } from '@/modules/bookings/components/CreateBookingDialog';

vi.mock('@/modules/bookings/hooks/useBookings', () => ({
  useAvailableSlots: () => ({ data: ['09:00', '09:30'], isLoading: false }),
}));

const doctors = [
  { id: 1, name: 'Ana Torres', specialty: 'Cardiología' },
  { id: 2, name: 'Luis Gomez' },
];

function renderDialog(overrides: {
  open?: boolean;
  isSubmitting?: boolean;
  isAuthenticated?: boolean;
  onSubmit?: (d: unknown) => void;
} = {}) {
  const {
    open = true,
    isSubmitting = false,
    isAuthenticated = false,
    onSubmit = vi.fn(),
  } = overrides;
  render(
    <AppThemeProvider>
      <CreateBookingDialog
        open={open}
        onClose={vi.fn()}
        onSubmit={onSubmit}
        isSubmitting={isSubmitting}
        doctors={doctors}
        isLoadingDoctors={false}
        isAuthenticated={isAuthenticated}
      />
    </AppThemeProvider>,
  );
  return { onSubmit };
}

async function fillBookingForm() {
  const input = screen.getByRole('combobox');
  fireEvent.mouseDown(input);
  fireEvent.change(input, { target: { value: 'Ana' } });
  const option = await screen.findByRole('option', { name: /Ana Torres/ });
  fireEvent.click(option);

  fireEvent.change(screen.getByLabelText('date'), { target: { value: '2026-08-01' } });

  await screen.findByText('available_slots');
  fireEvent.click(screen.getByText('09:00'));

  fireEvent.click(screen.getByRole('button', { name: 'book_appointment' }));
}

describe('CreateBookingDialog', () => {
  it('renders nothing when closed', () => {
    renderDialog({ open: false });
    expect(screen.queryByText('new_booking')).not.toBeInTheDocument();
  });

  it('shows the booking form title and doctor selector', () => {
    renderDialog();
    expect(screen.getByText('new_booking')).toBeInTheDocument();
    expect(screen.getByLabelText('Doctor')).toBeInTheDocument();
    expect(screen.getByLabelText('date')).toBeInTheDocument();
  });

  it('shows guest fields when the user is not authenticated', () => {
    renderDialog({ isAuthenticated: false });
    expect(screen.getByText('guest_info')).toBeInTheDocument();
    expect(screen.getByLabelText('full_name')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('phone')).toBeInTheDocument();
    expect(screen.getByLabelText('additional_notes')).toBeInTheDocument();
  });

  it('hides guest fields when the user is authenticated', () => {
    renderDialog({ isAuthenticated: true });
    expect(screen.queryByText('guest_info')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('full_name')).not.toBeInTheDocument();
    expect(screen.getByLabelText('additional_notes')).toBeInTheDocument();
  });

  it('submits the selected doctor, date and time', async () => {
    const { onSubmit } = renderDialog({ isAuthenticated: true });
    await fillBookingForm();
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        doctor_id: 1,
        date: '2026-08-01',
        time: '09:00',
        duration: 30,
      });
    });
  });

  it('includes guest data and notes in the payload when provided', async () => {
    const { onSubmit } = renderDialog({ isAuthenticated: false });

    await fillBookingForm();

    fireEvent.change(screen.getByLabelText('full_name'), { target: { value: 'Ana Torres' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ana@mail.com' } });
    fireEvent.change(screen.getByLabelText('phone'), { target: { value: '+56 9 1234 5678' } });
    fireEvent.change(screen.getByLabelText('additional_notes'), { target: { value: 'Prefiere tarde' } });
    fireEvent.click(screen.getByRole('button', { name: 'book_appointment' }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        doctor_id: 1,
        date: '2026-08-01',
        time: '09:00',
        duration: 30,
        guest_name: 'Ana Torres',
        guest_email: 'ana@mail.com',
        guest_phone: '+56 9 1234 5678',
        notes: 'Prefiere tarde',
      });
    });
  });

  it('does not include guest fields in the payload when authenticated', async () => {
    const { onSubmit } = renderDialog({ isAuthenticated: true });
    await fillBookingForm();
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        doctor_id: 1,
        date: '2026-08-01',
        time: '09:00',
        duration: 30,
      });
    });
    expect(onSubmit.mock.calls[0][0]).not.toHaveProperty('guest_name');
  });
});
