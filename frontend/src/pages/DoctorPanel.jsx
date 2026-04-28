import { useEffect, useState } from 'react';
import { getDoctorBookings } from '../api/doctors';
import { useNavigate } from 'react-router-dom';

export default function DoctorPanel() {
  const [bookings, setBookings] = useState([]);
  const navigate = useNavigate();

  const fetchBookings = async () => {
    try {
      const data = await getDoctorBookings();
      setBookings(data);
    } catch {
      alert('Error cargando agenda');
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  return (
    <div>
      <h2>Panel Doctor</h2>

      {/* 🔥 MENÚ PRINCIPAL */}
      <div style={{ marginBottom: '20px' }}>
        <button onClick={() => navigate('/doctor/calendar')}>
          📅 Calendario
        </button>

        <button
          onClick={() => navigate('/doctor/availability')}
          style={{ marginLeft: '10px' }}
        >
          ⏰ Disponibilidad
        </button>
      </div>

      <hr />

      {/* 🔥 LISTA DE RESERVAS */}
      <h3>Agenda</h3>

      {bookings.length === 0 && <p>No tienes reservas</p>}

      {bookings.map((b) => (
        <div
          key={b.id}
          style={{
            border: '1px solid #ccc',
            margin: 10,
            padding: 10,
            borderRadius: '6px'
          }}
        >
          <p><strong>Paciente:</strong> {b.patient_email}</p>
          <p><strong>Fecha:</strong> {b.date}</p>
          <p><strong>Hora:</strong> {b.time}</p>
          <p><strong>Duración:</strong> {b.duration} min</p>
        </div>
      ))}
    </div>
  );
}