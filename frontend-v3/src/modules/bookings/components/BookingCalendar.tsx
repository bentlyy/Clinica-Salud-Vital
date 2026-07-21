import { useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import type { Booking, BookingStatus } from '../types/booking.types';

interface BookingCalendarProps {
  bookings: Booking[];
  onEventClick?: (booking: Booking) => void;
}

const STATUS_COLORS: Record<BookingStatus, string> = {
  confirmed: '#0d9488',
  pending: '#d97706',
  cancelled: '#ef4444',
  completed: '#2563eb',
};

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  backgroundColor: string;
  borderColor: string;
  extendedProps: {
    booking: Booking;
  };
}

export function BookingCalendar({ bookings, onEventClick }: BookingCalendarProps) {
  const events = useMemo<CalendarEvent[]>(() => {
    return bookings
      .filter((b) => b.status !== 'cancelled')
      .map((booking) => {
        const startDate = new Date(`${booking.date}T${booking.time}:00`);
        const endDate = new Date(startDate.getTime() + booking.duration * 60 * 1000);

        const patientLabel = booking.patient_name || booking.guest_name || 'Sin nombre';

        return {
          id: String(booking.id),
          title: `${patientLabel} - ${booking.doctor_name || 'Doctor'}`,
          start: startDate.toISOString(),
          end: endDate.toISOString(),
          backgroundColor: STATUS_COLORS[booking.status] ?? '#6b7280',
          borderColor: STATUS_COLORS[booking.status] ?? '#6b7280',
          extendedProps: { booking },
        };
      });
  }, [bookings]);

  const handleEventClick = useMemo(
    () => (info: { event: { extendedProps: Record<string, unknown> } }) => {
      const booking = info.event.extendedProps['booking'] as Booking;
      onEventClick?.(booking);
    },
    [onEventClick],
  );

  if (bookings.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 6 }}>
        <Typography variant="body1" sx={{ color: '#6b7280' }}>
          No hay citas para mostrar en el calendario.
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        '& .fc': {
          fontFamily: '"Plus Jakarta Sans", sans-serif',
        },
        '& .fc-toolbar-title': {
          fontSize: '1.25rem',
          fontWeight: 600,
          color: '#1f2937',
        },
        '& .fc-button': {
          backgroundColor: '#0d9488',
          border: 'none',
          '&:hover': {
            backgroundColor: '#0f766e',
          },
          '&:disabled': {
            backgroundColor: '#d1d5db',
          },
        },
        '& .fc-button-active': {
          backgroundColor: '#0f766e !important',
          border: 'none !important',
        },
        '& .fc-event': {
          borderRadius: '6px',
          padding: '2px 6px',
          fontSize: '0.8125rem',
          cursor: 'pointer',
        },
        '& .fc-day-today': {
          backgroundColor: '#f0fdfa !important',
        },
        '& .fc-timegrid-slot': {
          height: '2.5rem',
        },
      }}
    >
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="timeGridWeek"
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay',
        }}
        events={events}
        eventClick={handleEventClick}
        locale="es"
        slotMinTime="06:00:00"
        slotMaxTime="22:00:00"
        allDaySlot={false}
        height="auto"
        contentHeight={600}
        nowIndicator
      />
    </Box>
  );
}
