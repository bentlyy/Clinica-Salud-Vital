import { useEffect, useState } from 'react';
import { getAvailability, createAvailability } from '../api/availability';
import { getExceptions, createException } from '../api/exceptions';

const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

// genera horas tipo 08:00 → 18:00
const generateHours = () => {
  const hours = [];
  for (let h = 8; h < 18; h++) {
    hours.push(`${h.toString().padStart(2, '0')}:00`);
    hours.push(`${h.toString().padStart(2, '0')}:30`);
  }
  return hours;
};

export default function DoctorCalendarPage() {
  const [availability, setAvailability] = useState([]);
  const [exceptions, setExceptions] = useState([]);

  const hours = generateHours();

  const fetchData = async () => {
    const [a, e] = await Promise.all([
      getAvailability(),
      getExceptions()
    ]);

    setAvailability(a);
    setExceptions(e);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // 🔥 verificar disponibilidad
  const isAvailable = (day, time) => {
    return availability.some(a =>
      a.day_of_week === day &&
      a.start_time <= time &&
      a.end_time > time
    );
  };

  // 🔥 verificar bloqueo
  const isBlocked = (day, time) => {
    return exceptions.some(e => {
      const d = new Date(e.date).getDay();

      if (d !== day) return false;

      if (e.is_full_day) return true;

      if (e.start_time && e.end_time) {
        return e.start_time <= time && e.end_time > time;
      }

      return false;
    });
  };

  // 🔥 click celda
  const handleClick = async (day, time) => {
    const action = prompt('1 = Disponible, 2 = Bloquear');

    try {
      if (action === '1') {
        await createAvailability({
          day_of_week: day,
          start_time: time,
          end_time: add30(time)
        });
      }

      if (action === '2') {
        const date = getNextDate(day);

        await createException({
          date,
          start_time: time,
          end_time: add30(time)
        });
      }

      await fetchData();

    } catch (err) {
      alert(err.response?.data?.error || 'Error');
    }
  };

  // 🔥 helpers
  const add30 = (time) => {
    const [h, m] = time.split(':').map(Number);
    const d = new Date();
    d.setHours(h);
    d.setMinutes(m + 30);
    return d.toTimeString().slice(0, 5);
  };

  const getNextDate = (day) => {
    const today = new Date();
    const diff = (day - today.getDay() + 7) % 7;
    const next = new Date();
    next.setDate(today.getDate() + diff);
    return next.toISOString().split('T')[0];
  };

  return (
    <div>
      <h2>Calendario Doctor</h2>

      <div style={{ display: 'grid', gridTemplateColumns: '80px repeat(7, 1fr)' }}>
        
        {/* header */}
        <div></div>
        {days.map((d, i) => (
          <div key={i} style={{ textAlign: 'center', fontWeight: 'bold' }}>
            {d}
          </div>
        ))}

        {/* grid */}
        {hours.map((hour) => (
          <>
            {/* hora */}
            <div key={hour}>{hour}</div>

            {days.map((_, dayIndex) => {
              const available = isAvailable(dayIndex, hour);
              const blocked = isBlocked(dayIndex, hour);

              let bg = '#eee';
              if (available) bg = '#4CAF50';
              if (blocked) bg = '#f44336';

              return (
                <div
                  key={`${dayIndex}-${hour}`}
                  onClick={() => handleClick(dayIndex, hour)}
                  style={{
                    border: '1px solid #ccc',
                    height: '30px',
                    cursor: 'pointer',
                    background: bg
                  }}
                />
              );
            })}
          </>
        ))}
      </div>

      <p>
        🟢 Disponible | 🔴 Bloqueado | Gris = vacío
      </p>
    </div>
  );
}