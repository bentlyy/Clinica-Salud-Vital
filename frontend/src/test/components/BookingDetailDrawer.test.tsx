import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AppThemeProvider } from '@/shared/providers/ThemeProvider';
import { BookingDetailDrawer } from '@/modules/bookings/components/BookingDetailDrawer';
import type { Booking } from '@/modules/bookings/types/booking.types';

const confirmedBooking: Booking = {
  id: 7,
  tenant_id: 1,
  patient_id: 42,
  doctor_id: 2,
  guest_name: null,
  guest_email: null,
  guest_phone: null,
  date: '2026-08-01',
  time: '10:00',
  duration: 30,
  status: 'confirmed',
  notes: 'Primera consulta',
  patient_name: 'Maria Garcia',
  doctor_name: 'Juan Perez',
  created_at: '2026-07-30T10:00:00',
  updated_at: '2026-07-30T10:00:00',
};

const cancelledBooking: Booking = {
  ...confirmedBooking,
  id: 8,
  status: 'cancelled',
  cancel_reason: 'No asistió',
  cancelled_at: '2026-07-31T15:30:00',
};

const completedBooking: Booking = {
  ...confirmedBooking,
  id: 9,
  status: 'completed',
};

function renderDrawer(overrides: {
  open?: boolean;
  booking?: Booking | null;
  onCancel?: (id: number, reason?: string) => void;
  isCancelling?: boolean;
} = {}) {
  const {
    open = true,
    booking = confirmedBooking,
    onCancel = vi.fn(),
    isCancelling = false,
  } = overrides;
  render(
    <AppThemeProvider>
      <BookingDetailDrawer
        open={open}
        onClose={vi.fn()}
        booking={booking}
        onCancel={onCancel}
        isCancelling={isCancelling}
      />
    </AppThemeProvider>,
  );
  return { onCancel };
}

describe('BookingDetailDrawer', () => {
  it('renders nothing when closed', () => {
    renderDrawer({ open: false });
    expect(screen.queryByText('bookingDetail')).not.toBeInTheDocument();
  });

  it('renders nothing when there is no booking', () => {
    renderDrawer({ booking: null });
    expect(screen.queryByText('bookingDetail')).not.toBeInTheDocument();
  });

  it('shows the booking details', () => {
    renderDrawer();
    expect(screen.getByText('bookingDetail')).toBeInTheDocument();
    expect(screen.getByText('Maria Garcia')).toBeInTheDocument();
    expect(screen.getByText('Juan Perez')).toBeInTheDocument();
    expect(screen.getByText('10:00 (30 min)')).toBeInTheDocument();
    expect(screen.getByText('Primera consulta')).toBeInTheDocument();
  });

  it('cancels the booking with a reason', () => {
    const { onCancel } = renderDrawer();

    fireEvent.click(screen.getByRole('button', { name: 'cancelBooking' }));
    expect(screen.getByText('confirm_cancel_message')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('cancelReason'), {
      target: { value: 'Cambio de horario' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'yes_cancel' }));

    expect(onCancel).toHaveBeenCalledWith(7, 'Cambio de horario');
  });

  it('cancels the booking without a reason', () => {
    const { onCancel } = renderDrawer();

    fireEvent.click(screen.getByRole('button', { name: 'cancelBooking' }));
    fireEvent.click(screen.getByRole('button', { name: 'yes_cancel' }));

    expect(onCancel).toHaveBeenCalledWith(7, undefined);
  });

  it('does not show the cancel button for a completed booking', () => {
    renderDrawer({ booking: completedBooking });
    expect(screen.queryByRole('button', { name: 'cancelBooking' })).not.toBeInTheDocument();
  });

  it('shows the cancellation reason and date for a cancelled booking', () => {
    renderDrawer({ booking: cancelledBooking });
    expect(screen.getByText('cancellationInfo')).toBeInTheDocument();
    expect(screen.getByText('No asistió')).toBeInTheDocument();
    expect(screen.getByText(/cancelledOn:/)).toBeInTheDocument();
  });

  it('disables the cancel button while cancelling', () => {
    renderDrawer({ isCancelling: true });
    expect(screen.getByRole('button', { name: 'cancelBooking' })).toBeDisabled();
  });
});
