import { useEffect, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';

import { getAvailability } from '../api/availability';
import { getExceptions, createException } from '../api/exceptions';

export default function DoctorCalendarPage() {
  const [events, setEvents] = useState([]);

  const fetchData = async () => {
    try {
      const [availability, exceptions] = await Promise.all([
        getAvailability(),
        getExceptions()
      ]);

      // 🔥 convertir disponibilidad a eventos
      const availabilityEvents = availability.map(a => ({
        daysOfWeek: [a.day_of_week],
        startTime: a.start_time,
        endTime: a.end_time,
        display: 'background',
        color: '#4CAF50'
      }));

      // 🔥 excepciones (bloqueos)
      const exceptionEvents = exceptions.map(e => ({
        start: e.start_time
          ? `${e.date}T${e.start_time}`
          : `${e.date}`,
        end: e.end_time
          ? `${e.date}T${e.end_time}`
          : `${e.date}`,
        display: 'background',
        color: '#f44336'
      }));

      setEvents([...availabilityEvents, ...exceptionEvents]);

    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // 🔥 click en slot → bloquear
  const handleSelect = async (info) => {
    try {
      await createException({
        date: info.startStr.split('T')[0],
        start_time: info.startStr.split('T')[1]?.slice(0,5),
        end_time: info.endStr.split('T')[1]?.slice(0,5)
      });

      fetchData();

    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div>
      <h2>Calendario Profesional</h2>

      <FullCalendar
        plugins={[timeGridPlugin, interactionPlugin]}
        initialView="timeGridWeek"
        selectable={true}
        select={handleSelect}

        slotDuration="00:30:00" // 🔥 30 min por defecto
        allDaySlot={false}

        events={events}

        height="auto"
      />
    </div>
  );
}