import { useEffect, useState } from 'react';
import { getMyBookings, deleteBooking } from '../api/bookings';
import { useNavigate } from 'react-router-dom';

export default function MyBookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    getMyBookings()
      .then(setBookings)
      .catch(() => setError('Error cargando reservas'))
      .finally(() => setLoading(false));
  }, []);

  const handleCancel = async (id) => {
    if (!window.confirm('¿Cancelar esta reserva?')) return;
    try {
      setCancellingId(id);
      await deleteBooking(id);
      setBookings((prev) => prev.filter((b) => b.id !== id));
    } catch (err) {
      setError(err.response?.data?.error || 'Error al cancelar');
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div className="page-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1>Mis Reservas</h1>
        <button onClick={() => navigate('/booking')} className="btn btn-primary">
          Nueva Reserva
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading && <p style={{ color: 'var(--text-muted)' }}>Cargando...</p>}

      {!loading && bookings.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <h3>No tienes reservas activas</h3>
          <p>Agenda tu primera cita médica ahora</p>
          <button onClick={() => navigate('/booking')} className="btn btn-primary">Reservar Ahora</button>
        </div>
      )}

      <div className="grid" style={{ gap: 12 }}>
        {bookings.map((b) => (
          <div key={b.id} className="card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
              <div>
                <strong style={{ fontSize: 16 }}>{b.doctor_name}</strong>
                <p style={{ margin: '2px 0 0', fontSize: 14 }}>{b.specialty}</p>
              </div>
              <span className={`badge ${b.confirmed ? 'badge-success' : b.status === 'cancelled' ? 'badge-danger' : 'badge-warning'}`}>
                {b.confirmed ? 'Confirmada' : b.status === 'cancelled' ? 'Cancelada' : 'Pendiente'}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 16, fontSize: 14, color: 'var(--text-secondary)', marginBottom: 14 }}>
              <span>📅 {b.date}</span>
              <span>🕐 {b.time}</span>
              <span>⏱ {b.duration} min</span>
            </div>
            {b.status !== 'cancelled' && (
              <button
                onClick={() => handleCancel(b.id)}
                disabled={cancellingId === b.id}
                className="btn btn-danger btn-sm"
              >
                {cancellingId === b.id ? 'Cancelando...' : 'Cancelar'}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
