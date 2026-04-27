import { useEffect, useState } from 'react';
import { getMyBookings, deleteBooking } from '../api/bookings';

export default function MyBookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  // 🔥 cargar reservas
  const fetchBookings = async () => {
    try {
      const data = await getMyBookings();
      setBookings(data);
    } catch (err) {
      alert('Error cargando reservas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  // 🔥 cancelar
  const handleCancel = async (id) => {
    if (!confirm('¿Cancelar esta reserva?')) return;

    try {
      await deleteBooking(id);

      // 🔥 refresh automático (clave)
      setBookings((prev) => prev.filter((b) => b.id !== id));

    } catch (err) {
      alert(err.response?.data?.error || 'Error al cancelar');
    }
  };

  if (loading) return <p>Cargando...</p>;

  return (
    <div>
      <h2>Mis Reservas</h2>

      {bookings.length === 0 && <p>No tienes reservas</p>}

      {bookings.map((b) => (
        <div key={b.id} style={{ border: '1px solid #ccc', margin: 10, padding: 10 }}>
          <p><strong>Doctor:</strong> {b.doctor_name}</p>
          <p><strong>Especialidad:</strong> {b.specialty}</p>
          <p><strong>Fecha:</strong> {b.date}</p>
          <p><strong>Hora:</strong> {b.time}</p>

          <button onClick={() => handleCancel(b.id)}>
            Cancelar
          </button>
        </div>
      ))}
    </div>
  );
}