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

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [creating, setCreating] = useState(false);

  const fetchAvailability = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await getAvailability();
      setAvailability(data);

    } catch {
      setError('Error cargando disponibilidad');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAvailability();
  }, []);

  // 🔥 generar bloques de 30 min
  const generateSlots = (start, end) => {
    const slots = [];
    let current = start;

    while (current < end) {
      const next = add30(current);

      slots.push({
        start_time: current,
        end_time: next
      });

      current = next;
    }

    return slots;
  };

  const add30 = (time) => {
    const [h, m] = time.split(':').map(Number);
    const d = new Date();
    d.setHours(h);
    d.setMinutes(m + 30);
    return d.toTimeString().slice(0, 5);
  };

  // 🔥 evitar duplicados
  const exists = (day, start, end) => {
    return availability.some(a =>
      a.day_of_week === day &&
      a.start_time === start &&
      a.end_time === end
    );
  };

  // 🔥 crear manual
  const handleCreate = async () => {
    if (startTime >= endTime) {
      return setError('Hora inválida');
    }

    try {
      setCreating(true);
      setError(null);

      const slots = generateSlots(startTime, endTime);

      for (const slot of slots) {
        if (exists(day, slot.start_time, slot.end_time)) continue;

        await createAvailability({
          day_of_week: day,
          start_time: slot.start_time,
          end_time: slot.end_time
        });
      }

      await fetchAvailability();

    } catch (err) {
      setError(err.response?.data?.error || 'Error');
    } finally {
      setCreating(false);
    }
  };

  // 🔥 DEFAULT VIERNES 08:00 - 17:00
  const handleGenerateDefault = async () => {
    try {
      setCreating(true);
      setError(null);

      const friday = 5; // 🔥 viernes
      const slots = generateSlots('08:00', '17:00');

      for (const slot of slots) {
        if (exists(friday, slot.start_time, slot.end_time)) continue;

        await createAvailability({
          day_of_week: friday,
          start_time: slot.start_time,
          end_time: slot.end_time
        });
      }

      await fetchAvailability();

    } catch {
      setError('Error generando horario');
    } finally {
      setCreating(false);
    }
  };

  // 🔥 eliminar
  const handleDelete = async (id) => {
    const ok = window.confirm('¿Eliminar este bloque?');
    if (!ok) return;

    try {
      await deleteAvailability(id);
      setAvailability(prev => prev.filter(a => a.id !== id));
    } catch {
      setError('Error eliminando');
    }
  };

  return (
    <div>
      <h2>Disponibilidad</h2>

      {error && (
        <div style={{ background: '#f44336', color: '#fff', padding: 10 }}>
          {error}
        </div>
      )}

      {/* 🔥 BOTÓN DEFAULT */}
      <div style={{ marginBottom: 20 }}>
        <button onClick={handleGenerateDefault} disabled={creating}>
          Generar viernes 08:00 - 17:00
        </button>
      </div>

      {/* 🔥 FORM */}
      <div style={{
        border: '1px solid #ccc',
        padding: 15,
        borderRadius: 8,
        marginBottom: 20
      }}>
        <h3>Agregar horario</h3>

        <div style={{ display: 'flex', gap: '10px' }}>
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

          <button onClick={handleCreate} disabled={creating}>
            {creating ? 'Generando...' : 'Agregar'}
          </button>
        </div>
      </div>

      {/* 🔥 LISTA */}
      <h3>Horarios actuales</h3>

      {loading && <p>Cargando...</p>}

      {!loading && availability.length === 0 && (
        <p>No tienes horarios</p>
      )}

      <div style={{ display: 'grid', gap: '10px' }}>
        {availability.map((a) => (
          <div key={a.id} style={{ border: '1px solid #ccc', padding: 10 }}>
            <p><strong>{days[a.day_of_week]}</strong></p>
            <p>{a.start_time} → {a.end_time}</p>

            <button onClick={() => handleDelete(a.id)}>
              Eliminar
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}