import { useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import type { Booking, BookingStatus } from '../types/booking.types';

interface BookingCalendarProps {
  bookings: Booking[];
  onEventClick?: (booking: Booking) => void;
}

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
  const theme = useTheme();
  const STATUS_COLORS: Record<BookingStatus, string> = useMemo(() => ({
    confirmed: theme.palette.primary.main,
    pending: theme.palette.warning.main,
    cancelled: theme.palette.error.main,
    completed: theme.palette.info.main,
    no_show: theme.palette.text.secondary,
  }), [theme]);

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
          backgroundColor: STATUS_COLORS[booking.status] ?? theme.palette.text.secondary,
          borderColor: STATUS_COLORS[booking.status] ?? theme.palette.text.secondary,
          extendedProps: { booking },
        };
      });
  }, [bookings, STATUS_COLORS, theme]);

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
        <Typography variant="body1" sx={{ color: theme.palette.text.secondary }}>
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
          color: theme.palette.text.primary,
        },
        '& .fc-button': {
          backgroundColor: `${theme.palette.primary.main} !important`,
          border: 'none',
          '&:hover': {
            backgroundColor: `${theme.palette.primary.dark} !important`,
          },
          '&:disabled': {
            backgroundColor: `${theme.palette.grey[300]} !important`,
          },
        },
        '& .fc-button-active': {
          backgroundColor: `${theme.palette.primary.dark} !important`,
          border: 'none !important',
        },
        '& .fc-event': {
          borderRadius: '6px',
          padding: '2px 6px',
          fontSize: '0.8125rem',
          cursor: 'pointer',
        },
        '& .fc-day-today': {
          backgroundColor: `${theme.palette.success.light} !important`,
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
