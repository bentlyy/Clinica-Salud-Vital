import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { getAvailability } from '../api/availability';
import { getExceptions, createException, deleteException } from '../api/exceptions';
import { getDoctorBookings } from '../api/doctors';
import { getDailyDensity } from '../api/bookings';
import { useTheme } from '../context/useTheme';
import { useI18n } from '../i18n/useI18n';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';

function mergeSlots(slots) {
  if (!slots.length) return [];
  const sorted = [...slots].sort(
    (a, b) => a.day_of_week - b.day_of_week || a.start_time.localeCompare(b.start_time)
  );
  const merged = [];
  let cur = { day_of_week: sorted[0].day_of_week, start_time: sorted[0].start_time, end_time: sorted[0].end_time };
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].day_of_week === cur.day_of_week && sorted[i].start_time === cur.end_time) {
      cur.end_time = sorted[i].end_time;
    } else {
      merged.push(cur);
      cur = { day_of_week: sorted[i].day_of_week, start_time: sorted[i].start_time, end_time: sorted[i].end_time };
    }
  }
  merged.push(cur);
  return merged;
}

function getMaxSlotsForDay(availability, dayOfWeek) {
  const blocks = availability.filter(a => a.day_of_week === dayOfWeek);
  if (!blocks.length) return 0;
  let totalMinutes = 0;
  for (const block of blocks) {
    const [sh, sm] = block.start_time.split(':').map(Number);
    const [eh, em] = block.end_time.split(':').map(Number);
    totalMinutes += (eh * 60 + em) - (sh * 60 + sm);
  }
  return Math.floor(totalMinutes / 30);
}

function getDensityInfo(dayOfWeek, dateStr, availability, densityMap) {
  const maxSlots = getMaxSlotsForDay(availability, dayOfWeek);
  const count = densityMap.get(dateStr) || 0;
  const hasAvail = maxSlots > 0;
  const ratio = hasAvail ? count / maxSlots : 0;
  return { maxSlots, count, ratio, hasAvail };
}

const DENSITY_COLORS = {
  noSchedule: { bg: '#F5F5F5', text: '#BDBDBD', labelKey: 'density_no_schedule' },
  empty: { bg: '#C8E6C9', text: '#2E7D32', labelKey: 'density_empty' },
  low: { bg: '#FFF9C4', text: '#F57F17', labelKey: 'density_low' },
  medium: { bg: '#FFE0B2', text: '#E65100', labelKey: 'density_medium' },
  full: { bg: '#FFCDD2', text: '#C62828', labelKey: 'density_full' },
};

function getDensityColor(dayOfWeek, dateStr, availability, densityMap, isWeekend) {
  const { maxSlots, count, hasAvail } = getDensityInfo(dayOfWeek, dateStr, availability, densityMap);
  if (!hasAvail) return DENSITY_COLORS.noSchedule;
  if (count === 0) return DENSITY_COLORS.empty;
  const ratio = count / maxSlots;
  if (ratio < 0.3) return DENSITY_COLORS.low;
  if (ratio < 0.7) return DENSITY_COLORS.medium;
  return DENSITY_COLORS.full;
}

export default function DoctorCalendarPage() {
  const { theme } = useTheme();
  const { t, locale } = useI18n();
  const calendarRef = useRef(null);
  const [allAvailability, setAllAvailability] = useState([]);
  const [allExceptions, setAllExceptions] = useState([]);
  const [allBookings, setAllBookings] = useState([]);
  const [densityData, setDensityData] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [blockModal, setBlockModal] = useState({ open: false, date: '', start: '', end: '' });
  const [blockReason, setBlockReason] = useState('');
  const [filters, setFilters] = useState({ availability: true, exceptions: true, bookings: true });
  const [calendarHeight, setCalendarHeight] = useState(600);

  const isDark = theme === 'dark';

  const COLORS = useMemo(() => ({
    available: isDark ? '#1B5E20' : '#C8E6C9',
    availableText: isDark ? '#A5D6A7' : '#2E7D32',
    blocked: isDark ? '#B71C1C' : '#EF5350',
    blockedText: '#FFFFFF',
    blockedBorder: isDark ? '#C62828' : '#E53935',
    booking: isDark ? '#1565C0' : '#1565C0',
    bookingBorder: isDark ? '#1976D2' : '#0D47A1',
    bookingPending: isDark ? '#E65100' : '#E65100',
    bookingPendingBorder: isDark ? '#D84315' : '#BF360C',
    bookingText: '#FFFFFF',
  }), [isDark]);

  useEffect(() => {
    const calc = () => {
      const el = document.querySelector('.page-container-wide');
      if (el) {
        const rect = el.getBoundingClientRect();
        setCalendarHeight(Math.max(400, window.innerHeight - rect.top - 50));
      }
    };
    calc();
    window.addEventListener('resize', calc);
    return () => window.removeEventListener('resize', calc);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const [avail, exc, bks] = await Promise.all([
        getAvailability(),
        getExceptions(),
        getDoctorBookings(),
      ]);
      setAllAvailability(avail || []);
      setAllExceptions(exc || []);
      setAllBookings(Array.isArray(bks) ? bks : (bks?.data || []));
    } catch (err) {
      setError(t('doctor_calendar.error_load'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const densityMap = useMemo(() => {
    const map = new Map();
    for (const d of densityData) {
      map.set(d.date, d.count);
    }
    return map;
  }, [densityData]);

  const handleDatesSet = useCallback(async (info) => {
    const start = info.startStr.slice(0, 10);
    const end = info.endStr.slice(0, 10);
    try {
      const res = await getDailyDensity(start, end);
      setDensityData(res?.data || []);
    } catch {
      // density es opcional
    }
  }, []);

  const handleDayCellDidMount = useCallback((info) => {
    if (info.view.type !== 'dayGridMonth') return;
    const dateStr = info.dateStr;
    const jsDay = info.date.getDay();
    const dayOfWeek = jsDay === 0 ? 7 : jsDay;
    const color = getDensityColor(dayOfWeek, dateStr, allAvailability, densityMap);
    info.el.style.backgroundColor = color.bg;
    const numEl = info.el.querySelector('.fc-daygrid-day-number');
    if (numEl) numEl.style.color = color.text;
    info.el.style.borderRadius = '4px';
    info.el.style.transition = 'all 0.15s';
    info.el.title = `${dateStr}: ${(densityMap.get(dateStr) || 0)} citas`;
  }, [allAvailability, densityMap]);

  const handleDateClick = useCallback((info) => {
    if (info.view.type === 'dayGridMonth') {
      const api = calendarRef.current?.getApi();
      if (api) {
        api.changeView('timeGridDay', info.dateStr);
      }
    }
  }, []);

  const events = useMemo(() => {
    const list = [];

    if (filters.availability && allAvailability.length) {
      mergeSlots(allAvailability).forEach((a) => {
        list.push({
          daysOfWeek: [a.day_of_week],
          startTime: a.start_time,
          endTime: a.end_time,
          title: ' ',
          color: COLORS.available,
          display: 'background',
          classNames: ['ev-avail'],
          extendedProps: { type: 'availability' },
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
          color: COLORS.blocked,
          textColor: COLORS.blockedText,
          borderColor: COLORS.blockedBorder,
          classNames: ['ev-blocked'],
          extendedProps: { type: 'exception', exceptionId: e.id },
        });
      });
    }

    if (filters.bookings) {
      allBookings.forEach((b) => {
        const name = b.patient_email || b.guest_name || `Paciente #${b.id}`;
        const mins = (b.duration || 30);
        const [bh, bm] = b.time.split(':').map(Number);
        const total = bh * 60 + bm + mins;
        const start = `${b.date}T${b.time}`;
        const end = `${b.date}T${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;

        list.push({
          id: `bk-${b.id}`,
          title: b.confirmed ? `${name}` : `${name} ⏳`,
          start,
          end,
          color: b.confirmed ? COLORS.booking : COLORS.bookingPending,
          textColor: COLORS.bookingText,
          borderColor: b.confirmed ? COLORS.bookingBorder : COLORS.bookingPendingBorder,
          classNames: ['ev-booking'],
          extendedProps: {
            type: 'booking',
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
  }, [allAvailability, allExceptions, allBookings, filters, COLORS, t]);

  const handleSelect = (info) => {
    const date = info.startStr.split('T')[0];
    const startT = info.startStr.split('T')[1]?.slice(0, 5);
    const endT = info.endStr.split('T')[1]?.slice(0, 5);
    if (startT && endT) {
      setBlockModal({ open: true, date, start: startT, end: endT });
      setBlockReason('');
    }
  };

  const confirmBlock = async () => {
    try {
      setError(null);
      await createException({
        date: blockModal.date,
        start_time: blockModal.start,
        end_time: blockModal.end,
        reason: blockReason || undefined,
      });
      setBlockModal({ open: false, date: '', start: '', end: '' });
      setBlockReason('');
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || t('doctor_calendar.error'));
    }
  };

  const handleEventClick = (info) => {
    const p = info.event.extendedProps;
    if (p.type === 'exception') {
      if (window.confirm(t('doctor_calendar.block_confirm'))) {
        deleteException(p.exceptionId)
          .then(() => fetchData())
          .catch(() => setError(t('doctor_calendar.error_unblock')));
      }
    } else if (p.type === 'booking') {
      setSelectedBooking(p);
    }
  };

  const renderEventContent = (eventInfo) => {
    const p = eventInfo.event.extendedProps;
    if (p.type === 'booking') {
      return (
        <div style={{ padding: '2px 4px', lineHeight: 1.3, overflow: 'hidden' }}>
          <div style={{ fontWeight: 700, fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {eventInfo.event.title}
          </div>
          <div style={{ fontSize: 10, opacity: 0.9, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {p.time} ({p.duration}min)
            {p.rut && ` • ${p.rut}`}
          </div>
        </div>
      );
    }
    if (p.type === 'exception') {
      return (
        <div style={{ padding: '2px 4px', lineHeight: 1.3, fontWeight: 700, fontSize: 11 }}>
          {eventInfo.event.title}
        </div>
      );
    }
    return null;
  };

  const today = () => calendarRef.current?.getApi().today();

  return (
    <div className="page-container-wide" style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <div className="page-header">
        <div>
          <h1 style={{ margin: 0 }}>{t('doctor_calendar.title')}</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: 4 }}>
            {t('doctor_calendar.subtitle')}
          </p>
        </div>
        <button onClick={today} className="btn btn-outline btn-sm">{t('doctor_calendar.today')}</button>
      </div>

      {error && <ErrorState message={error} />}

      <div style={{
        display: 'flex', gap: 8, marginBottom: 16, padding: '10px 16px',
        background: 'var(--bg-secondary)', borderRadius: 8, alignItems: 'center', flexWrap: 'wrap', flexShrink: 0,
      }}>
        <span style={{ fontWeight: 600, fontSize: 13, marginRight: 4 }}>{t('doctor_calendar.filter_show')}</span>
        {[
          { key: 'bookings', label: t('doctor_calendar.filter_bookings'), color: COLORS.booking, active: filters.bookings },
          { key: 'availability', label: t('doctor_calendar.filter_availability'), color: COLORS.available, active: filters.availability },
          { key: 'exceptions', label: t('doctor_calendar.filter_exceptions'), color: COLORS.blocked, active: filters.exceptions },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilters(prev => ({ ...prev, [f.key]: !prev[f.key] }))}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
              padding: '6px 14px', borderRadius: 20, border: 'none',
              fontSize: 13, fontWeight: 500, userSelect: 'none',
              transition: 'all 0.15s',
              background: f.active ? f.color : 'transparent',
              color: f.active ? '#fff' : 'var(--text-secondary)',
              outline: f.active ? 'none' : '1px solid var(--border-light)',
            }}
          >
            <span style={{
              display: 'inline-block', width: 10, height: 10, borderRadius: '50%',
              background: f.active ? '#fff' : f.color,
            }}></span>
            {f.label}
            {f.active && <span style={{ fontSize: 11, marginLeft: 2 }}>✓</span>}
          </button>
        ))}
        {loading && <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 8 }}>{t('doctor_calendar.updating')}</span>}
      </div>

      <div style={{
        display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap',
        padding: '8px 16px', background: 'var(--bg-secondary)', borderRadius: 8,
        fontSize: 12, alignItems: 'center',
      }}>
        <span style={{ fontWeight: 600, marginRight: 4 }}>{t('density_legend')}</span>
        {[
          { key: 'noSchedule', color: DENSITY_COLORS.noSchedule },
          { key: 'empty', color: DENSITY_COLORS.empty },
          { key: 'low', color: DENSITY_COLORS.low },
          { key: 'medium', color: DENSITY_COLORS.medium },
          { key: 'full', color: DENSITY_COLORS.full },
        ].map((item) => (
          <span key={item.key} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{
              display: 'inline-block', width: 14, height: 14, borderRadius: 3,
              background: item.color.bg, border: '1px solid ' + item.color.text,
            }} />
            <span style={{ color: 'var(--text-secondary)' }}>{t(item.color.labelKey)}</span>
          </span>
        ))}
        <span style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: 11 }}>
          {t('density_hint')}
        </span>
      </div>

      {loading && events.length === 0 ? (
        <LoadingState message={t('doctor_calendar.loading')} fullPage />
      ) : (
        <div style={{
          background: 'var(--bg-primary)', borderRadius: 12,
          border: '1px solid var(--border-light)', overflow: 'hidden',
          flex: 1, minHeight: 400,
        }}>
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            selectable
            select={handleSelect}
            eventClick={handleEventClick}
            dateClick={handleDateClick}
            eventContent={renderEventContent}
            dayCellDidMount={handleDayCellDidMount}
            datesSet={handleDatesSet}
            slotDuration="00:30:00"
            slotMinTime="08:00"
            slotMaxTime="20:00"
            allDaySlot={false}
            events={events}
            height={calendarHeight}
            locale={locale === 'pt' ? 'pt-br' : locale === 'en' ? 'en' : locale === 'fr' ? 'fr' : 'es'}
            firstDay={1}
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,timeGridWeek,timeGridDay',
            }}
            buttonText={{
              today: t('doctor_calendar.today'),
              month: locale === 'en' ? 'Month' : 'Mes',
              week: locale === 'en' ? 'Week' : 'Semana',
              day: locale === 'en' ? 'Day' : 'Día',
            }}
            slotLabelFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
            eventTimeFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
            nowIndicator
            weekNumbers={false}
            editable={false}
            selectOverlap={false}
            stickyHeaderDates
            dayMaxEvents={3}
            fixedWeekCount={false}
            showNonCurrentDates={false}
          />
        </div>
      )}

      {selectedBooking && (
        <div style={OVERLAY} onClick={() => setSelectedBooking(null)}>
          <div style={MODAL} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 18 }}>{t('doctor_calendar.detail_title')}</h3>
              <button onClick={() => setSelectedBooking(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text-secondary)' }}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Row label={t('doctor_calendar.patient')} value={selectedBooking.patient} />
              {selectedBooking.email && <Row label={t('doctor_calendar.email')} value={selectedBooking.email} />}
              {selectedBooking.phone && <Row label={t('doctor_calendar.phone')} value={selectedBooking.phone} />}
              {selectedBooking.rut && <Row label={t('doctor_calendar.rut')} value={selectedBooking.rut} />}
              <Row label={t('booking.date_label')} value={selectedBooking.date} />
              <Row label={t('booking.time_label')} value={`${selectedBooking.time} (${selectedBooking.duration} min)`} />
              <Row label={t('doctor_calendar.status')} value={
                <span className={`badge ${selectedBooking.confirmed ? 'badge-success' : 'badge-warning'}`}>
                  {selectedBooking.confirmed ? t('doctor_calendar.status_confirmed') : t('doctor_calendar.status_pending')}
                </span>
              } />
            </div>
          </div>
        </div>
      )}

      {blockModal.open && (
        <div style={OVERLAY} onClick={() => setBlockModal(prev => ({ ...prev, open: false }))}>
          <div style={MODAL} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 16px' }}>{t('doctor_calendar.block_modal_title')}</h3>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 16 }}>
              {blockModal.date} — {blockModal.start} a {blockModal.end}
            </p>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, marginBottom: 6, fontWeight: 500 }}>{t('doctor_calendar.block_reason')}</label>
              <input
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border-light)',
                  background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: 14,
                  outline: 'none', boxSizing: 'border-box',
                }}
                value={blockReason}
                onChange={e => setBlockReason(e.target.value)}
                placeholder={t('doctor_calendar.block_reason_placeholder')}
              />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setBlockModal(prev => ({ ...prev, open: false }))} className="btn btn-ghost">{t('doctor_calendar.cancel')}</button>
              <button onClick={confirmBlock} className="btn btn-primary">{t('doctor_calendar.block_modal_title')}</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

function Row({ label, value }) {
  return (
    <div>
      <strong style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{label}</strong>
      <p style={{ margin: '2px 0 0', fontSize: 14 }}>{value}</p>
    </div>
  );
}

const OVERLAY = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 99999, padding: 20,
};

const MODAL = {
  background: 'var(--bg-primary)', borderRadius: 12, padding: 24,
  maxWidth: 420, width: '100%',
  boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
};
