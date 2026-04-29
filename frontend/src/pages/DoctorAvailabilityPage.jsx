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

  // 🔥 validar solapamiento
  const isOverlapping = () => {
    return availability.some(a =>
      a.day_of_week === day &&
      !(endTime <= a.start_time || startTime >= a.end_time)
    );
  };

  // 🔥 crear
  const handleCreate = async () => {
    if (startTime >= endTime) {
      return setError('La hora de inicio debe ser menor a la de fin');
    }

    if (isOverlapping()) {
      return setError('Este horario se solapa con uno existente');
    }

    try {
      setCreating(true);
      setError(null);

      await createAvailability({
        day_of_week: day,
        start_time: startTime,
        end_time: endTime
      });

      await fetchAvailability();

    } catch (err) {
      setError(err.response?.data?.error || 'Error al crear');
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

      {/* 🔥 ERROR */}
      {error && (
        <div style={{ background: '#f44336', color: '#fff', padding: 10 }}>
          {error}
        </div>
      )}

      {/* 🔥 FORM */}
      <div style={{
        border: '1px solid #ccc',
        padding: 15,
        borderRadius: 8,
        marginBottom: 20
      }}>
        <h3>Agregar horario</h3>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
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

          <button
            onClick={handleCreate}
            disabled={creating}
          >
            {creating ? 'Agregando...' : 'Agregar'}
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
          <div
            key={a.id}
            style={{
              border: '1px solid #ccc',
              padding: 10,
              borderRadius: 6
            }}
          >
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