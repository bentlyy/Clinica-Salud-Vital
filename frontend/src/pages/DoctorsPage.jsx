import { useEffect, useState } from 'react';
import { getDoctors } from '../api/doctors';
import { getAvailableSlots, createBooking } from '../api/bookings';
import { useNavigate } from 'react-router-dom';

export default function DoctorsPage() {
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [date, setDate] = useState('');
  const [slots, setSlots] = useState([]);
  const [selectedTime, setSelectedTime] = useState(null);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const navigate = useNavigate();

  // 🔥 cargar doctores
  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const data = await getDoctors();
        setDoctors(data);
      } catch {
        alert('Error cargando doctores');
      }
    };

    fetchDoctors();
  }, []);

  // 🔥 cargar slots
  const handleLoadSlots = async (doctorId) => {
    if (!date) {
      alert('Selecciona una fecha');
      return;
    }

    try {
      setLoadingSlots(true);

      const data = await getAvailableSlots(doctorId, date);

      setSlots(data);
      setSelectedDoctor(doctorId);
      setSelectedTime(null); // 🔥 reset selección

    } catch {
      alert('Error cargando horarios');
    } finally {
      setLoadingSlots(false);
    }
  };

  // 🔥 reservar
  const handleBooking = async () => {
    try {
      await createBooking({
        doctor_id: selectedDoctor,
        date,
        time: selectedTime
      });

      alert('Reserva creada ✅');

      // 🔥 refresh slots
      const updated = await getAvailableSlots(selectedDoctor, date);
      setSlots(updated);
      setSelectedTime(null);

    } catch (err) {
      alert(err.response?.data?.error || 'Error al reservar');
    }
  };

  return (
    <div>
      <h2>Doctors</h2>

      {/* 🔥 navegación */}
      <button onClick={() => navigate('/my-bookings')}>
        Ver mis reservas
      </button>

      <hr />

      {/* 🔥 seleccionar fecha */}
      <div>
        <label>Selecciona fecha:</label>
        <input
          type="date"
          value={date}
          onChange={(e) => {
            setDate(e.target.value);
            setSlots([]); // 🔥 limpiar slots si cambia fecha
            setSelectedTime(null);
          }}
        />
      </div>

      <hr />

      {/* 🔥 lista doctores */}
      {doctors.map((doc) => (
        <div key={doc.id} style={{ marginBottom: '20px' }}>
          <h3>{doc.name}</h3>
          <p>{doc.specialty}</p>

          <button onClick={() => handleLoadSlots(doc.id)}>
            Ver horarios
          </button>
        </div>
      ))}

      <hr />

      {/* 🔥 loading */}
      {loadingSlots && <p>Cargando horarios...</p>}

      {/* 🔥 slots */}
      {slots.length > 0 && (
        <div>
          <h3>Horarios disponibles</h3>

          {slots.map((slot) => (
            <button
              key={slot}
              onClick={() => setSelectedTime(slot)}
              style={{
                margin: '5px',
                padding: '8px',
                cursor: 'pointer',
                background: selectedTime === slot ? '#4CAF50' : '#ddd'
              }}
            >
              {slot}
            </button>
          ))}

          <div style={{ marginTop: '10px' }}>
            <button
              disabled={!selectedTime}
              onClick={handleBooking}
            >
              Reservar
            </button>
          </div>
        </div>
      )}

      {/* 🔥 sin slots */}
      {selectedDoctor && slots.length === 0 && !loadingSlots && (
        <p>No hay horarios disponibles</p>
      )}
    </div>
  );
}