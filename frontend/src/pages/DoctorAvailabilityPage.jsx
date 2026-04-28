import { useEffect, useState } from 'react';
import {
  getAvailability,
  createAvailability,
  deleteAvailability
} from '../api/availability';

const days = [
  'Domingo',
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado'
];

export default function DoctorAvailabilityPage() {
  const [availability, setAvailability] = useState([]);

  const [day, setDay] = useState(1);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');

  const fetchAvailability = async () => {
    const data = await getAvailability();
    setAvailability(data);
  };

  useEffect(() => {
    fetchAvailability();
  }, []);

  // 🔥 crear bloque
  const handleCreate = async () => {
    try {
      await createAvailability({
        day_of_week: day,
        start_time: startTime,
        end_time: endTime
      });

      await fetchAvailability();
    } catch (err) {
      alert(err.response?.data?.error || 'Error');
    }
  };

  // 🔥 eliminar
  const handleDelete = async (id) => {
    if (!confirm('Eliminar bloque?')) return;

    await deleteAvailability(id);
    setAvailability((prev) => prev.filter(a => a.id !== id));
  };

  return (
    <div>
      <h2>Disponibilidad</h2>

      {/* 🔥 CREAR */}
      <div style={{ border: '1px solid #ccc', padding: 10 }}>
        <h3>Agregar horario</h3>

        <select value={day} onChange={(e) => setDay(Number(e.target.value))}>
          {days.map((d, i) => (
            <option key={i} value={i}>{d}</option>
          ))}
        </select>

        <input
          type="time"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
        />

        <input
          type="time"
          value={endTime}
          onChange={(e) => setEndTime(e.target.value)}
        />

        <button onClick={handleCreate}>
          Agregar
        </button>
      </div>

      <hr />

      {/* 🔥 LISTA */}
      <h3>Horarios actuales</h3>

      {availability.length === 0 && <p>No tienes horarios</p>}

      {availability.map((a) => (
        <div key={a.id} style={{ border: '1px solid #ccc', margin: 10, padding: 10 }}>
          <p><strong>Día:</strong> {days[a.day_of_week]}</p>
          <p><strong>Desde:</strong> {a.start_time}</p>
          <p><strong>Hasta:</strong> {a.end_time}</p>

          <button onClick={() => handleDelete(a.id)}>
            Eliminar
          </button>
        </div>
      ))}
    </div>
  );
}