import { useEffect, useState } from 'react';
import { getDoctorBookings } from '../api/doctors';
import { useNavigate } from 'react-router-dom';

export default function DoctorPanel() {
  const [bookings, setBookings] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const navigate = useNavigate();

  const fetchBookings = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await getDoctorBookings();
      setBookings(data);

    } catch {
      setError('Error cargando agenda');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  return (
    <div>
      <h2>Panel del Doctor</h2>

      {/* 🔥 ERROR */}
      {error && (
        <div
          style={{
            background: '#f44336',
            color: '#fff',
            padding: '10px',
            marginBottom: '10px'
          }}
        >
          {error}
        </div>
      )}

      {/* 🔥 ACCIONES (tipo dashboard) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '15px',
          marginBottom: '20px'
        }}
      >
        <div
          onClick={() => navigate('/doctor/calendar')}
          style={{
            border: '1px solid #ccc',
            padding: '20px',
            borderRadius: '8px',
            cursor: 'pointer',
            background: '#f9f9f9'
          }}
        >
          <h3>📅 Calendario</h3>
          <p>Gestiona horarios visualmente</p>
        </div>

        <div
          onClick={() => navigate('/doctor/availability')}
          style={{
            border: '1px solid #ccc',
            padding: '20px',
            borderRadius: '8px',
            cursor: 'pointer',
            background: '#f9f9f9'
          }}
        >
          <h3>⏰ Disponibilidad</h3>
          <p>Define tus horarios base</p>
        </div>
      </div>

      <hr />

      {/* 🔥 AGENDA */}
      <h3>Próximas citas</h3>

      {loading && <p>Cargando agenda...</p>}

      {!loading && bookings.length === 0 && (
        <p>No tienes reservas</p>
      )}

      <div style={{ display: 'grid', gap: '10px' }}>
        {bookings.map((b) => (
          <div
            key={b.id}
            style={{
              border: '1px solid #ccc',
              padding: '15px',
              borderRadius: '8px',
              background: '#fff'
            }}
          >
            <div style={{ marginBottom: '8px' }}>
              <strong>{b.patient_email}</strong>
            </div>

            <div style={{ color: '#555' }}>
              <p><strong>Fecha:</strong> {b.date}</p>
              <p><strong>Hora:</strong> {b.time}</p>
              <p><strong>Duración:</strong> {b.duration} min</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}