import { useEffect, useState } from 'react';
import { getDoctorBookings } from '../api/doctors';
import { useNavigate } from 'react-router-dom';

export default function DoctorPanel() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    getDoctorBookings()
      .then(setBookings)
      .catch(() => setError('Error cargando agenda'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page-container-wide">
      <h1 style={{ marginBottom: 24 }}>Panel del Doctor</h1>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="grid grid-2" style={{ marginBottom: 32 }}>
        <div className="card card-subtle" onClick={() => navigate('/doctor/calendar')} style={{ cursor: 'pointer', padding: 32 }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📅</div>
          <h3>Calendario</h3>
          <p>Gestiona horarios visualmente</p>
        </div>
        <div className="card card-subtle" onClick={() => navigate('/doctor/availability')} style={{ cursor: 'pointer', padding: 32 }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⏰</div>
          <h3>Disponibilidad</h3>
          <p>Define tus horarios base</p>
        </div>
      </div>

      <h2 style={{ marginBottom: 16 }}>Próximas Citas</h2>

      {loading && <p style={{ color: 'var(--text-muted)' }}>Cargando...</p>}
      {!loading && bookings.length === 0 && (
        <div className="empty-state">
          <p>No tienes citas programadas</p>
        </div>
      )}

      <div className="grid" style={{ gap: 12 }}>
        {bookings.map((b) => (
          <div key={b.id} className="card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
              <div>
                <strong>{b.patient_email || b.guest_name || 'Paciente'}</strong>
                {b.guest_rut && <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>RUT: {b.guest_rut}</p>}
                {b.guest_phone && <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>Tel: {b.guest_phone}</p>}
              </div>
              <span className={`badge ${b.confirmed ? 'badge-success' : 'badge-warning'}`}>
                {b.confirmed ? 'Confirmada' : 'Pendiente'}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 16, fontSize: 14, color: 'var(--text-secondary)' }}>
              <span>📅 {b.date}</span>
              <span>🕐 {b.time}</span>
              <span>⏱ {b.duration} min</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
