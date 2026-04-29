import { useEffect, useState } from 'react';
import { getMyBookings, deleteBooking } from '../api/bookings';

export default function MyBookingsPage() {
  const [bookings, setBookings] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [cancellingId, setCancellingId] = useState(null);

  // 🔥 cargar reservas
  const fetchBookings = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await getMyBookings();
      setBookings(data);

    } catch (err) {
      setError('Error cargando reservas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  // 🔥 cancelar
  const handleCancel = async (id) => {
    const confirmCancel = window.confirm('¿Cancelar esta reserva?');
    if (!confirmCancel) return;

    try {
      setCancellingId(id);

      await deleteBooking(id);

      // 🔥 actualización optimista
      setBookings((prev) => prev.filter((b) => b.id !== id));

    } catch (err) {
      setError(err.response?.data?.error || 'Error al cancelar');
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div>
      <h2>Mis Reservas</h2>

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

      {/* 🔥 LOADING */}
      {loading && <p>Cargando reservas...</p>}

      {/* 🔥 VACÍO */}
      {!loading && bookings.length === 0 && (
        <p>No tienes reservas</p>
      )}

      {/* 🔥 LISTA */}
      <div style={{ display: 'grid', gap: '10px' }}>
        {bookings.map((b) => (
          <div
            key={b.id}
            style={{
              border: '1px solid #ccc',
              padding: '15px',
              borderRadius: '8px',
              background: '#fafafa'
            }}
          >
            <div style={{ marginBottom: '10px' }}>
              <strong>{b.doctor_name}</strong>
              <p style={{ margin: 0, color: '#666' }}>
                {b.specialty}
              </p>
            </div>

            <div style={{ marginBottom: '10px' }}>
              <p><strong>Fecha:</strong> {b.date}</p>
              <p><strong>Hora:</strong> {b.time}</p>
            </div>

            <button
              onClick={() => handleCancel(b.id)}
              disabled={cancellingId === b.id}
              style={{
                padding: '8px 12px',
                background: '#f44336',
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
                opacity: cancellingId === b.id ? 0.6 : 1
              }}
            >
              {cancellingId === b.id ? 'Cancelando...' : 'Cancelar'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}