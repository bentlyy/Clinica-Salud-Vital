import { useEffect, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';

import { getAvailability } from '../api/availability';
import { getExceptions, createException, deleteException } from '../api/exceptions';

export default function DoctorCalendarPage() {
  const [events, setEvents] = useState([]);
  const [exceptions, setExceptions] = useState([]);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      setError(null);
      const [availability, exceptionList] = await Promise.all([
        getAvailability(),
        getExceptions(),
      ]);

      setExceptions(exceptionList);

      const availabilityEvents = availability.map((a) => ({
        daysOfWeek: [a.day_of_week],
        startTime: a.start_time,
        endTime: a.end_time,
        display: 'background',
        color: '#4CAF50',
      }));

      // ✅ Store exception id in event so we can delete from the UI
      const exceptionEvents = exceptionList.map((e) => ({
        id: `exc-${e.id}`,
        title: e.is_full_day ? '🚫 Día bloqueado' : '🚫 Bloqueado',
        start: e.start_time ? `${e.date}T${e.start_time}` : e.date,
        end:   e.end_time   ? `${e.date}T${e.end_time}`   : e.date,
        display: 'block',
        backgroundColor: '#f44336',
        borderColor: '#c62828',
        extendedProps: { exceptionId: e.id },
      }));

      setEvents([...availabilityEvents, ...exceptionEvents]);
    } catch (err) {
      setError('Error cargando calendario');
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Block a time range by clicking/dragging on the calendar
  const handleSelect = async (info) => {
    try {
      setError(null);
      await createException({
        date: info.startStr.split('T')[0],
        start_time: info.startStr.split('T')[1]?.slice(0, 5),
        end_time:   info.endStr.split('T')[1]?.slice(0, 5),
      });
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al bloquear horario');
    }
  };

  // ✅ Click on a blocked event to delete it (unblock)
  const handleEventClick = async (info) => {
    const exceptionId = info.event.extendedProps?.exceptionId;
    if (!exceptionId) return; // background availability events have no id

    const ok = window.confirm('¿Desbloquear este horario?');
    if (!ok) return;

    try {
      setError(null);
      await deleteException(exceptionId);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al desbloquear');
    }
  };

  return (
    <div>
      <h2>Calendario Profesional</h2>
      <p style={{ color: '#555', fontSize: 14 }}>
        Selecciona un rango para <strong>bloquear</strong> horarios. Haz clic en un bloque rojo para <strong>desbloquearlo</strong>.
      </p>

      {error && (
        <div style={{ background: '#f44336', color: '#fff', padding: 10, marginBottom: 10 }}>
          {error}
        </div>
      )}

      <FullCalendar
        plugins={[timeGridPlugin, interactionPlugin]}
        initialView="timeGridWeek"
        selectable={true}
        select={handleSelect}
        eventClick={handleEventClick} // ✅ allows unblocking
        slotDuration="00:30:00"
        allDaySlot={false}
        events={events}
        height="auto"
      />
    </div>
  );
}
