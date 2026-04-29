import { useEffect, useState } from 'react';
import { getAvailability, createAvailability } from '../api/availability';
import { getExceptions, createException } from '../api/exceptions';

const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

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

  const [mode, setMode] = useState('available'); // 🔥 clave
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const hours = generateHours();

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [a, e] = await Promise.all([
        getAvailability(),
        getExceptions()
      ]);

      setAvailability(a);
      setExceptions(e);

    } catch {
      setError('Error cargando calendario');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const isAvailable = (day, time) => {
    return availability.some(a =>
      a.day_of_week === day &&
      a.start_time <= time &&
      a.end_time > time
    );
  };

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

  const handleClick = async (day, time) => {
    try {
      if (mode === 'available') {
        await createAvailability({
          day_of_week: day,
          start_time: time,
          end_time: add30(time)
        });
      }

      if (mode === 'blocked') {
        const date = getNextDate(day);

        await createException({
          date,
          start_time: time,
          end_time: add30(time)
        });
      }

      await fetchData();

    } catch (err) {
      setError(err.response?.data?.error || 'Error');
    }
  };

  return (
    <div>
      <h2>Calendario Doctor</h2>

      {/* 🔥 CONTROLES */}
      <div style={{ marginBottom: 15 }}>
        <button onClick={() => setMode('available')}>
          🟢 Disponible
        </button>

        <button
          onClick={() => setMode('blocked')}
          style={{ marginLeft: 10 }}
        >
          🔴 Bloquear
        </button>
      </div>

      {/* 🔥 ERROR */}
      {error && (
        <div style={{ background: '#f44336', color: '#fff', padding: 10 }}>
          {error}
        </div>
      )}

      {loading && <p>Cargando...</p>}

      {!loading && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: '80px repeat(7, 1fr)'
        }}>
          <div></div>
          {days.map((d, i) => (
            <div key={i} style={{ textAlign: 'center', fontWeight: 'bold' }}>
              {d}
            </div>
          ))}

          {hours.map((hour) => (
            <div key={hour + '-row'} style={{ display: 'contents' }}>
              <div>{hour}</div>

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
            </div>
          ))}
        </div>
      )}

      <p>🟢 Disponible | 🔴 Bloqueado</p>
    </div>
  );
}