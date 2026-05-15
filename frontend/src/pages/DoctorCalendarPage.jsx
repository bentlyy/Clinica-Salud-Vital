import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { getAvailability } from '../api/availability';
import { getExceptions, createException, deleteException } from '../api/exceptions';
import { getDoctorBookings } from '../api/doctors';
import { useTheme } from '../context/useTheme';

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

export default function DoctorCalendarPage() {
  const { theme } = useTheme();
  const calendarRef = useRef(null);
  const [allAvailability, setAllAvailability] = useState([]);
  const [allExceptions, setAllExceptions] = useState([]);
  const [allBookings, setAllBookings] = useState([]);
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
    availableBorder: isDark ? '#2E7D32' : '#66BB6A',
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
      setError('Error cargando calendario');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

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
        const label = e.reason ? ` ${e.reason}` : ' Bloqueado';
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
  }, [allAvailability, allExceptions, allBookings, filters, COLORS]);

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
      setError(err.response?.data?.error || 'Error al bloquear');
    }
  };

  const handleEventClick = (info) => {
    const p = info.event.extendedProps;
    if (p.type === 'exception') {
      if (window.confirm('¿Desbloquear este horario?')) {
        deleteException(p.exceptionId)
          .then(() => fetchData())
          .catch(() => setError('Error al desbloquear'));
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
          <h1 style={{ margin: 0 }}>Calendario</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: 4 }}>
            Tus citas, disponibilidad y bloqueos en una vista
          </p>
        </div>
        <button onClick={today} className="btn btn-outline btn-sm">Hoy</button>
      </div>

      {error && <div className="alert alert-error" style={{ flexShrink: 0 }}>{error}</div>}

      <div style={{
        display: 'flex', gap: 8, marginBottom: 16, padding: '10px 16px',
        background: 'var(--bg-secondary)', borderRadius: 8, alignItems: 'center', flexWrap: 'wrap', flexShrink: 0,
      }}>
        <span style={{ fontWeight: 600, fontSize: 13, marginRight: 4 }}>Mostrar:</span>
        {[
          { key: 'bookings', label: 'Citas', color: COLORS.booking, active: filters.bookings },
          { key: 'availability', label: 'Disponibilidad', color: COLORS.available, active: filters.availability },
          { key: 'exceptions', label: 'Bloqueos', color: COLORS.blocked, active: filters.exceptions },
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
        {loading && <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 8 }}>actualizando...</span>}
      </div>

      {loading && events.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, flexShrink: 0 }}>
          <div className="spinner" style={{ margin: 'auto' }}></div>
          <p style={{ marginTop: 12, color: 'var(--text-secondary)' }}>Cargando calendario...</p>
        </div>
      ) : (
        <div style={{
          background: 'var(--bg-primary)', borderRadius: 12,
          border: '1px solid var(--border-light)', overflow: 'hidden',
          flex: 1, minHeight: 400,
        }}>
          <FullCalendar
            ref={calendarRef}
            plugins={[timeGridPlugin, interactionPlugin]}
            initialView="timeGridWeek"
            selectable
            select={handleSelect}
            eventClick={handleEventClick}
            eventContent={renderEventContent}
            slotDuration="00:30:00"
            slotMinTime="08:00"
            slotMaxTime="20:00"
            allDaySlot={false}
            events={events}
            height={calendarHeight}
            locale="es"
            firstDay={1}
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'timeGridWeek,timeGridDay',
            }}
            buttonText={{ today: 'Hoy', week: 'Semana', day: 'Día' }}
            slotLabelFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
            eventTimeFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
            nowIndicator
            weekNumbers={false}
            editable={false}
            selectOverlap={false}
            stickyHeaderDates
          />
        </div>
      )}

      {selectedBooking && (
        <div style={OVERLAY} onClick={() => setSelectedBooking(null)}>
          <div style={MODAL} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 18 }}>Detalle de la Cita</h3>
              <button onClick={() => setSelectedBooking(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text-secondary)' }}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Row label="Paciente" value={selectedBooking.patient} />
              {selectedBooking.email && <Row label="Email" value={selectedBooking.email} />}
              {selectedBooking.phone && <Row label="Teléfono" value={selectedBooking.phone} />}
              {selectedBooking.rut && <Row label="RUT" value={selectedBooking.rut} />}
              <Row label="Fecha" value={selectedBooking.date} />
              <Row label="Hora" value={`${selectedBooking.time} (${selectedBooking.duration} min)`} />
              <Row label="Estado" value={
                <span className={`badge ${selectedBooking.confirmed ? 'badge-success' : 'badge-warning'}`}>
                  {selectedBooking.confirmed ? 'Confirmada' : 'Pendiente'}
                </span>
              } />
            </div>
          </div>
        </div>
      )}

      {blockModal.open && (
        <div style={OVERLAY} onClick={() => setBlockModal(prev => ({ ...prev, open: false }))}>
          <div style={MODAL} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 16px' }}>Bloquear Horario</h3>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 16 }}>
              {blockModal.date} — {blockModal.start} a {blockModal.end}
            </p>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, marginBottom: 6, fontWeight: 500 }}>Motivo (opcional)</label>
              <input
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border-light)',
                  background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: 14,
                  outline: 'none', boxSizing: 'border-box',
                }}
                value={blockReason}
                onChange={e => setBlockReason(e.target.value)}
                placeholder="Ej: Bloqueo administrativo, colación..."
              />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setBlockModal(prev => ({ ...prev, open: false }))} className="btn btn-ghost">Cancelar</button>
              <button onClick={confirmBlock} className="btn btn-primary">Bloquear</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .fc { font-family: inherit; font-size: 13px; }
        .fc .fc-toolbar { margin-bottom: 10px; }
        .fc .fc-toolbar-title { font-size: 1.1em; font-weight: 600; }
        .fc .fc-button {
          font-family: inherit; font-size: 12px !important; padding: 5px 10px !important;
          border-radius: 6px !important; border: 1px solid var(--border-light) !important;
          background: var(--bg-primary) !important; color: var(--text-primary) !important;
          transition: all 0.15s !important; box-shadow: none !important;
        }
        .fc .fc-button:hover { background: var(--bg-secondary) !important; }
        .fc .fc-button:focus { box-shadow: none !important; }
        .fc .fc-button-primary:not(:disabled).fc-button-active,
        .fc .fc-button-primary:not(:disabled):active {
          background: var(--primary-600) !important; border-color: var(--primary-600) !important;
          color: #fff !important;
        }
        .fc .fc-today-button { font-weight: 600 !important; }
        .fc .fc-button .fc-icon { font-size: 1em; }
        .fc .fc-col-header-cell { padding: 4px 0; background: var(--bg-secondary); }
        .fc .fc-day-today { background: var(--primary-50) !important; }
        .fc .fc-timegrid-slot { height: 1.6em; }
        .fc .fc-timegrid-now-indicator-line { border-color: var(--danger-500); }
        .fc .fc-timegrid-now-indicator-arrow {
          border-color: var(--danger-500); border-width: 5px 0 5px 6px;
        }

        .fc .fc-event {
          border-radius: 4px; font-size: 11px; padding: 0;
          border-width: 1px; cursor: pointer;
        }
        .fc .fc-event.ev-avail {
          opacity: 0.3; cursor: default;
        }
        .fc .fc-event.ev-blocked { font-weight: 600; opacity: 0.9; }
        .fc .fc-event.ev-booking {
          font-weight: 500;
          box-shadow: 0 1px 3px rgba(0,0,0,0.2);
        }
        .fc .fc-event.ev-booking:hover { filter: brightness(1.1); }

        .fc .fc-scrollgrid,
        .fc .fc-scrollgrid td,
        .fc .fc-scrollgrid th,
        .fc .fc-timegrid-axis,
        .fc .fc-timegrid-slot-lane {
          border-color: var(--border-light);
        }

        .fc .fc-timegrid-col { width: 100% !important; }
        .fc .fc-timegrid-body { width: 100% !important; }
        .fc .fc-daygrid-body { width: 100% !important; }

        .fc .fc-timegrid-slots table,
        .fc .fc-timegrid-col-events table,
        .fc .fc-timegrid-bg-harness table {
          width: 100% !important;
        }
      `}</style>
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
