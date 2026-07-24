import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@mui/material/styles';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import {
  Box,
  Paper,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  ToggleButton,
  ToggleButtonGroup,
  IconButton,
  Divider,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import BlockIcon from '@mui/icons-material/Block';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import { apiClient } from '@/shared/services/api-client';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { LoadingState } from '@/shared/components/ui/LoadingState';
import { ErrorState } from '@/shared/components/ui/ErrorState';
import { useAuth } from '@/shared/providers/AuthProvider';
import type { CalendarOptions, EventInput } from '@fullcalendar/core';

/* ---------------------------------------------------------------------------
   Types
   --------------------------------------------------------------------------- */

interface AvailabilitySlot {
  id: number;
  doctor_id: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
}

interface Exception {
  id: number;
  date: string;
  start_time: string | null;
  end_time: string | null;
  reason: string | null;
}

interface Booking {
  id: number;
  patient_email?: string;
  guest_name?: string;
  guest_email?: string;
  guest_phone?: string;
  guest_rut?: string;
  patient_rut?: string;
  time: string;
  date: string;
  duration?: number;
  confirmed?: boolean;
}

interface BookingDetail {
  patient: string;
  email: string;
  phone: string;
  rut: string;
  date: string;
  time: string;
  duration: number;
  confirmed: boolean;
}

/* ---------------------------------------------------------------------------
   Helpers
   --------------------------------------------------------------------------- */

function mergeSlots(slots: AvailabilitySlot[]): AvailabilitySlot[] {
  if (!slots.length) return [];
  const sorted = [...slots].sort(
    (a, b) => a.day_of_week - b.day_of_week || a.start_time.localeCompare(b.start_time),
  );
  const merged: { day_of_week: number; start_time: string; end_time: string }[] = [];
  const first = sorted[0];
  if (!first) return [];
  let cur = { day_of_week: first.day_of_week, start_time: first.start_time, end_time: first.end_time };
  for (let i = 1; i < sorted.length; i++) {
    const slot = sorted[i];
    if (!slot) continue;
    if (slot.day_of_week === cur.day_of_week && slot.start_time === cur.end_time) {
      cur = { ...cur, end_time: slot.end_time };
    } else {
      merged.push(cur);
      cur = { day_of_week: slot.day_of_week, start_time: slot.start_time, end_time: slot.end_time };
    }
  }
  merged.push(cur);
  return merged as unknown as AvailabilitySlot[];
}

/* ---------------------------------------------------------------------------
   Component
   --------------------------------------------------------------------------- */

interface Filters {
  availability: boolean;
  bookings: boolean;
  exceptions: boolean;
}

export default function DoctorCalendarPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const theme = useTheme();
  const calendarRef = useRef<FullCalendar>(null);

  const [allAvailability, setAllAvailability] = useState<AvailabilitySlot[]>([]);
  const [allExceptions, setAllExceptions] = useState<Exception[]>([]);
  const [allBookings, setAllBookings] = useState<Booking[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [selectedBooking, setSelectedBooking] = useState<BookingDetail | null>(null);
  const [blockModalOpen, setBlockModalOpen] = useState(false);
  const [blockRange, setBlockRange] = useState({ date: '', start: '', end: '' });
  const [blockReason, setBlockReason] = useState('');

  const [filters, setFilters] = useState<Filters>({
    availability: true,
    exceptions: true,
    bookings: true,
  });

  const [calendarHeight, setCalendarHeight] = useState(600);

  const localeMap: Record<string, string> = {
    pt: 'pt-br',
    en: 'en',
    fr: 'fr',
    es: 'es',
  };
  const calLocale = localeMap[user?.tenant_slug ?? ''] ?? 'es';

  /* Dynamic height */
  useEffect(() => {
    const calc = () => {
      const el = document.querySelector('.fc');
      if (el) {
        const rect = el.getBoundingClientRect();
        setCalendarHeight(Math.max(400, window.innerHeight - rect.top - 50));
      }
    };
    calc();
    window.addEventListener('resize', calc);
    return () => window.removeEventListener('resize', calc);
  }, []);

  /* Fetch data */
  const fetchData = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const [availRes, excRes, bksRes] = await Promise.all([
        apiClient.get<AvailabilitySlot[]>('/availability'),
        apiClient.get<Exception[]>('/availability/exceptions'),
        apiClient.get<Booking[]>('/bookings', { params: { doctor_id: user?.id } }),
      ]);
      setAllAvailability(availRes.data ?? []);
      setAllExceptions(excRes.data ?? []);
      setAllBookings(Array.isArray(bksRes.data) ? bksRes.data : []);
    } catch {
      setError(t('errors.fetchError'));
    } finally {
      setLoading(false);
    }
  }, [t, user?.id]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  /* Events */
  const events = useMemo<EventInput[]>(() => {
    const list: EventInput[] = [];

    if (filters.availability && allAvailability.length) {
      mergeSlots(allAvailability).forEach((a) => {
        list.push({
          daysOfWeek: [a.day_of_week],
          startTime: a.start_time,
          endTime: a.end_time,
          title: ' ',
          color: theme.palette.custom.brand.lightest,
          display: 'background',
          extendedProps: { type: 'availability' as const },
        });
      });
    }

    if (filters.exceptions) {
      allExceptions.forEach((e) => {
        const label = e.reason ? ` ${e.reason}` : ` ${t('doctor_calendar.filter_exceptions')}`;
        list.push({
          id: `exc-${e.id}`,
          title: label,
          start: e.start_time ? `${e.date}T${e.start_time}` : e.date,
          end: e.end_time ? `${e.date}T${e.end_time}` : e.date,
          color: theme.palette.error.main,
          textColor: theme.palette.common.white,
          borderColor: theme.palette.error.dark,
          extendedProps: { type: 'exception' as const, exceptionId: e.id },
        });
      });
    }

    if (filters.bookings) {
      allBookings.forEach((b) => {
        const name = b.patient_email || b.guest_name || `Paciente #${b.id}`;
        const mins = b.duration ?? 30;
        const [bh, bm] = b.time.split(':').map(Number);
        const startMins = (bh ?? 0) * 60 + (bm ?? 0) + mins;
        const endH = String(Math.floor(startMins / 60)).padStart(2, '0');
        const endM = String(startMins % 60).padStart(2, '0');
        const start = `${b.date}T${b.time}`;
        const end = `${b.date}T${endH}:${endM}`;

        list.push({
          id: `bk-${b.id}`,
          title: b.confirmed ? name : `${name} (P)`,
          start,
          end,
          color: b.confirmed ? theme.palette.info.dark : theme.palette.warning.dark,
          textColor: theme.palette.common.white,
          borderColor: b.confirmed ? theme.palette.info.main : theme.palette.warning.main,
          extendedProps: {
            type: 'booking' as const,
            bookingId: b.id,
            patient: name,
            email: b.patient_email || b.guest_email || '',
            phone: b.guest_phone || '',
            rut: b.patient_rut || b.guest_rut || '',
            date: b.date,
            time: b.time,
            duration: b.duration,
            confirmed: b.confirmed,
          },
        });
      });
    }

    return list;
  }, [allAvailability, allExceptions, allBookings, filters, t]);

  /* Handlers */
  const handleSelect = useCallback(
    (info: { startStr: string; endStr: string }) => {
      const date = info.startStr.split('T')[0] ?? '';
      const startT = info.startStr.split('T')[1]?.slice(0, 5) ?? '';
      const endT = info.endStr.split('T')[1]?.slice(0, 5) ?? '';
      if (startT && endT) {
        setBlockRange({ date, start: startT, end: endT });
        setBlockReason('');
        setBlockModalOpen(true);
      }
    },
    [],
  );

  const confirmBlock = useCallback(async () => {
    try {
      setError(null);
      await apiClient.post('/availability/exceptions', {
        date: blockRange.date,
        start_time: blockRange.start,
        end_time: blockRange.end,
        reason: blockReason || undefined,
      });
      setBlockModalOpen(false);
      setBlockReason('');
      await fetchData();
    } catch {
      setError(t('errors.generic'));
    }
  }, [blockRange, blockReason, fetchData, t]);

  const handleEventClick = useCallback(
    async (info: { event: { extendedProps: Record<string, unknown>; id: string } }) => {
      const p = info.event.extendedProps;
      if (p.type === 'exception') {
        const confirmed = window.confirm(t('doctor_calendar.delete_block'));
        if (confirmed) {
          try {
            await apiClient.delete(`/availability/exceptions/${String(p.exceptionId)}`);
            await fetchData();
          } catch {
            setError(t('errors.deleteError'));
          }
        }
      } else if (p.type === 'booking') {
        setSelectedBooking({
          patient: String(p.patient ?? ''),
          email: String(p.email ?? ''),
          phone: String(p.phone ?? ''),
          rut: String(p.rut ?? ''),
          date: String(p.date ?? ''),
          time: String(p.time ?? ''),
          duration: Number(p.duration ?? 30),
          confirmed: Boolean(p.confirmed),
        });
      }
    },
    [fetchData, t],
  );

  const handleDateClick = useCallback(
    (info: { view: { type: string }; dateStr: string }) => {
      if (info.view.type === 'dayGridMonth') {
        const api = calendarRef.current?.getApi();
        if (api) {
          api.changeView('timeGridDay', info.dateStr);
        }
      }
    },
    [],
  );

  const renderEventContent = useCallback(
    (eventInfo: { event: { title: string; extendedProps: Record<string, unknown> } }) => {
      const p = eventInfo.event.extendedProps;
      if (p.type === 'booking') {
        return (
          <Box sx={{ px: 0.5, lineHeight: 1.3, overflow: 'hidden' }}>
            <Typography sx={{ fontWeight: 700, fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {eventInfo.event.title}
            </Typography>
            <Typography sx={{ fontSize: 10, opacity: 0.9, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {String(p.time)} ({String(p.duration ?? 30)}min)
              {p.rut ? ` • ${String(p.rut)}` : ''}
            </Typography>
          </Box>
        );
      }
      if (p.type === 'exception') {
        return (
          <Box sx={{ px: 0.5, lineHeight: 1.3, fontWeight: 700, fontSize: 11 }}>
            {eventInfo.event.title}
          </Box>
        );
      }
      return null;
    },
    [],
  );

  const today = useCallback(() => {
    calendarRef.current?.getApi().today();
  }, []);

  const handleFilterChange = useCallback(
    (_: React.MouseEvent<HTMLElement>, newFilters: string[] | null) => {
      if (newFilters !== null) {
        setFilters({
          availability: newFilters.includes('availability'),
          bookings: newFilters.includes('bookings'),
          exceptions: newFilters.includes('exceptions'),
        });
      }
    },
    [],
  );

  const activeFilters = useMemo(() => {
    const result: string[] = [];
    if (filters.availability) result.push('availability');
    if (filters.bookings) result.push('bookings');
    if (filters.exceptions) result.push('exceptions');
    return result;
  }, [filters]);

  const calOptions = useMemo<Partial<CalendarOptions>>(() => ({
    plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
    initialView: 'dayGridMonth',
    selectable: true,
    select: handleSelect,
    eventClick: handleEventClick,
    dateClick: handleDateClick,
    eventContent: renderEventContent,
    slotDuration: '00:30:00',
    slotMinTime: '08:00:00',
    slotMaxTime: '20:00:00',
    allDaySlot: false,
    events,
    height: calendarHeight,
    locale: calLocale,
    firstDay: 1,
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek,timeGridDay',
    },
    slotLabelFormat: { hour: '2-digit', minute: '2-digit', hour12: false },
    eventTimeFormat: { hour: '2-digit', minute: '2-digit', hour12: false },
    nowIndicator: true,
    weekNumbers: false,
    editable: false,
    selectOverlap: false,
    stickyHeaderDates: true,
    dayMaxEvents: 3,
    fixedWeekCount: false,
    showNonCurrentDates: false,
  }), [handleSelect, handleEventClick, handleDateClick, renderEventContent, events, calendarHeight, calLocale]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100%', p: 3 }}>
      <PageHeader
        title={t('doctor_calendar.title')}
        subtitle={t('doctor_calendar.subtitle')}
        action={
          <Button
            variant="outlined"
            size="small"
            startIcon={<CalendarTodayIcon />}
            onClick={today}
          >
            {t('dates.today')}
          </Button>
        }
      />

      {error && <ErrorState error={new Error(error)} onRetry={fetchData} />}

      {/* Filters */}
      <Paper sx={{ p: 1.5, mb: 2, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        <Typography variant="caption" sx={{ fontWeight: 600, mr: 1 }}>
          {t('doctor_calendar.filter_availability')}:
        </Typography>
        <ToggleButtonGroup
          value={activeFilters}
          onChange={handleFilterChange}
          size="small"
          aria-label="calendar filters"
        >
          <ToggleButton value="bookings" aria-label="bookings">
            <EventAvailableIcon sx={{ fontSize: 16, mr: 0.5, color: theme.palette.info.dark }} />
            {t('doctor_calendar.filter_bookings')}
          </ToggleButton>
          <ToggleButton value="availability" aria-label="availability">
            <EventAvailableIcon sx={{ fontSize: 16, mr: 0.5, color: theme.palette.success.dark }} />
            {t('doctor_calendar.filter_availability')}
          </ToggleButton>
          <ToggleButton value="exceptions" aria-label="exceptions">
            <EventBusyIcon sx={{ fontSize: 16, mr: 0.5, color: theme.palette.error.main }} />
            {t('doctor_calendar.filter_exceptions')}
          </ToggleButton>
        </ToggleButtonGroup>
        {loading && (
          <Typography variant="caption" sx={{ color: 'text.secondary', ml: 1 }}>
            {t('common.loading')}
          </Typography>
        )}
      </Paper>

      {/* Legend */}
      <Paper sx={{ p: 1.5, mb: 2, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        {[
          { color: theme.palette.custom.brand.lightest, label: t('doctor_calendar.filter_availability') },
          { color: theme.palette.info.dark, label: t('doctor_calendar.filter_bookings') },
          { color: theme.palette.error.main, label: t('doctor_calendar.filter_exceptions') },
        ].map((item) => (
          <Box key={item.label} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box
              sx={{
                width: 14,
                height: 14,
                borderRadius: 0.5,
                bgcolor: item.color,
                border: '1px solid',
                borderColor: 'divider',
              }}
            />
            <Typography variant="caption" color="text.secondary">
              {item.label}
            </Typography>
          </Box>
        ))}
      </Paper>

      {/* Calendar */}
      {loading && events.length === 0 ? (
        <LoadingState message={t('common.loading')} />
      ) : (
        <Paper sx={{ flex: 1, minHeight: 400, overflow: 'hidden', '& .fc': { fontFamily: 'inherit' } }}>
          <FullCalendar ref={calendarRef} {...calOptions} />
        </Paper>
      )}

      {/* Booking Detail Dialog */}
      <Dialog
        open={!!selectedBooking}
        onClose={() => setSelectedBooking(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {t('doctor_calendar.booking_detail')}
          <IconButton size="small" onClick={() => setSelectedBooking(null)}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <Divider />
        <DialogContent>
          {selectedBooking && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <DetailRow label={t('doctor_calendar.patient')} value={selectedBooking.patient} />
              {selectedBooking.email && <DetailRow label={t('common.email')} value={selectedBooking.email} />}
              {selectedBooking.phone && <DetailRow label={t('common.phone')} value={selectedBooking.phone} />}
              {selectedBooking.rut && <DetailRow label="RUT" value={selectedBooking.rut} />}
              <DetailRow label={t('common.date')} value={selectedBooking.date} />
              <DetailRow
                label={t('common.time')}
                value={`${selectedBooking.time} (${String(selectedBooking.duration)} min)`}
              />
              <DetailRow
                label={t('common.status')}
                value={
                  <Chip
                    size="small"
                    label={selectedBooking.confirmed ? t('common.confirmed') : t('common.pending')}
                    color={selectedBooking.confirmed ? 'success' : 'warning'}
                  />
                }
              />
            </Box>
          )}
        </DialogContent>
      </Dialog>

      {/* Block Time Dialog */}
      <Dialog
        open={blockModalOpen}
        onClose={() => setBlockModalOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <BlockIcon />
          {t('doctor_calendar.block_time')}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
            {blockRange.date} — {blockRange.start} {t('common.to', { defaultValue: 'a' })} {blockRange.end}
          </Typography>
          <TextField
            fullWidth
            label={t('doctor_calendar.block_reason')}
            value={blockReason}
            onChange={(e) => setBlockReason(e.target.value)}
            placeholder={t('doctor_calendar.block_reason')}
            multiline
            rows={2}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBlockModalOpen(false)}>{t('common.cancel')}</Button>
          <Button variant="contained" color="error" onClick={confirmBlock} startIcon={<BlockIcon />}>
            {t('doctor_calendar.confirm_block')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

/* ---------------------------------------------------------------------------
   Sub-components
   --------------------------------------------------------------------------- */

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Box>
      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
        {label}
      </Typography>
      <Typography variant="body2">{value}</Typography>
    </Box>
  );
}
