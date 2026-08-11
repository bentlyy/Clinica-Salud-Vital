import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AppThemeProvider } from '@/shared/providers/ThemeProvider';
import FullCalendar from '@fullcalendar/react';
import { BookingCalendar } from '@/modules/bookings/components/BookingCalendar';
import type { Booking } from '@/modules/bookings/types/booking.types';

vi.mock('@fullcalendar/react', () => ({
  default: vi.fn(() => <div data-testid="calendar" />),
}));

vi.mock('@fullcalendar/daygrid', () => ({ default: { key: 'dayGridPlugin' } }));
vi.mock('@fullcalendar/timegrid', () => ({ default: { key: 'timeGridPlugin' } }));
vi.mock('@fullcalendar/interaction', () => ({ default: { key: 'interactionPlugin' } }));

const baseBooking: Booking = {
  id: 1,
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
  notes: null,
  patient_name: 'Maria Garcia',
  doctor_name: 'Juan Perez',
  created_at: '2026-07-30T10:00:00',
  updated_at: '2026-07-30T10:00:00',
};

const bookings: Booking[] = [
  baseBooking,
  {
    ...baseBooking,
    id: 2,
    date: '2026-08-01',
    time: '11:00',
    patient_name: 'Luis Gomez',
    status: 'pending',
  },
  {
    ...baseBooking,
    id: 3,
    date: '2026-08-01',
    time: '12:00',
    status: 'cancelled',
  },
];

function renderCalendar(overrides: { bookings?: Booking[]; onEventClick?: (b: Booking) => void } = {}) {
  const { bookings: list = bookings, onEventClick = vi.fn() } = overrides;
  render(
    <AppThemeProvider>
      <BookingCalendar bookings={list} onEventClick={onEventClick} />
    </AppThemeProvider>,
  );
  return { onEventClick };
}

function getCalendarProps() {
  const calls = vi.mocked(FullCalendar).mock.calls;
  return calls[calls.length - 1][0] as {
    events: {
      id: string;
      title: string;
      start: string;
      end: string;
      extendedProps: { booking: Booking };
    }[];
    eventClick: (info: { event: { extendedProps: { booking: Booking } } }) => void;
  };
}

describe('BookingCalendar', () => {
  it('shows an empty message when there are no bookings', () => {
    renderCalendar({ bookings: [] });
    expect(screen.getByText('No hay citas para mostrar en el calendario.')).toBeInTheDocument();
  });

  it('maps bookings to calendar events', () => {
    renderCalendar();
    const props = getCalendarProps();
    expect(props.events).toHaveLength(2);

    const first = props.events[0];
    expect(first.title).toBe('Maria Garcia - Juan Perez');
    expect(new Date(first.start).getTime()).toBe(new Date('2026-08-01T10:00:00').getTime());
    expect(new Date(first.end).getTime()).toBe(new Date('2026-08-01T10:30:00').getTime());
  });

  it('excludes cancelled bookings from the events', () => {
    renderCalendar();
    const props = getCalendarProps();
    const ids = props.events.map((e) => e.id);
    expect(ids).not.toContain('3');
  });

  it('triggers onEventClick with the booking', () => {
    const { onEventClick } = renderCalendar();
    const props = getCalendarProps();
    props.eventClick({ event: { extendedProps: { booking: bookings[0] } } });
    expect(onEventClick).toHaveBeenCalledWith(bookings[0]);
  });
});
