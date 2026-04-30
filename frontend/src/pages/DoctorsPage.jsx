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

  const [loadingDoctors, setLoadingDoctors] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false); // ✅ prevents double-click
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const data = await getDoctors();
        setDoctors(data);
      } catch {
        setError('Error cargando doctores');
      } finally {
        setLoadingDoctors(false);
      }
    };
    fetchDoctors();
  }, []);

  useEffect(() => {
    if (!selectedDoctor || !date) return;

    const loadSlots = async () => {
      try {
        setLoadingSlots(true);
        setError(null);
        setSuccessMsg(null);

        const data = await getAvailableSlots(selectedDoctor, date);
        setSlots(data);
        setSelectedTime(null);
      } catch {
        setError('Error cargando horarios');
      } finally {
        setLoadingSlots(false);
      }
    };

    loadSlots();
  }, [selectedDoctor, date]);

  // ✅ Guard against double-click / double-submit
  const handleBooking = async () => {
    if (submitting) return;

    try {
      setSubmitting(true);
      setError(null);
      setSuccessMsg(null);

      await createBooking({ doctor_id: selectedDoctor, date, time: selectedTime });

      setSuccessMsg('✅ Reserva realizada con éxito');

      // Refresh slots to show the booked one as unavailable
      const updated = await getAvailableSlots(selectedDoctor, date);
      setSlots(updated);
      setSelectedTime(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al reservar');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h2>Reservar hora</h2>

      <button onClick={() => navigate('/my-bookings')}>Ver mis reservas</button>

      <hr />

      {error && (
        <div style={{ background: '#f44336', color: '#fff', padding: '10px', marginBottom: '10px' }}>
          {error}
        </div>
      )}

      {successMsg && (
        <div style={{ background: '#4CAF50', color: '#fff', padding: '10px', marginBottom: '10px' }}>
          {successMsg}
        </div>
      )}

      <div style={{ marginBottom: '20px' }}>
        <label>Selecciona fecha:</label><br />
        <input
          type="date"
          value={date}
          min={new Date().toISOString().split('T')[0]} // ✅ prevent past dates in UI
          onChange={(e) => {
            setDate(e.target.value);
            setSlots([]);
            setSelectedTime(null);
            setSuccessMsg(null);
          }}
        />
      </div>

      <h3>Selecciona un doctor</h3>

      {loadingDoctors && <p>Cargando doctores...</p>}

      <div style={{ display: 'grid', gap: '10px' }}>
        {doctors.map((doc) => (
          <div
            key={doc.id}
            onClick={() => {
              setSelectedDoctor(doc.id);
              setSlots([]);
              setSelectedTime(null);
              setSuccessMsg(null);
            }}
            style={{
              border: selectedDoctor === doc.id ? '2px solid #4CAF50' : '1px solid #ccc',
              padding: '10px',
              borderRadius: '6px',
              cursor: 'pointer',
              background: selectedDoctor === doc.id ? '#e8f5e9' : '#fff',
            }}
          >
            <h4>{doc.name}</h4>
            <p>{doc.specialty}</p>
          </div>
        ))}
      </div>

      <hr />

      {selectedDoctor && date && (
        <div>
          <h3>Horarios disponibles</h3>

          {loadingSlots && <p>Cargando horarios...</p>}

          {!loadingSlots && slots.length === 0 && (
            <p>No hay horarios disponibles para esta fecha</p>
          )}

          <div style={{ display: 'flex', flexWrap: 'wrap' }}>
            {slots.map((slot) => (
              <button
                key={slot}
                onClick={() => setSelectedTime(slot)}
                style={{
                  margin: '5px',
                  padding: '8px',
                  cursor: 'pointer',
                  borderRadius: '4px',
                  border: '1px solid #ccc',
                  background: selectedTime === slot ? '#4CAF50' : '#eee',
                  color: selectedTime === slot ? '#fff' : '#000',
                }}
              >
                {slot}
              </button>
            ))}
          </div>

          <div style={{ marginTop: '15px' }}>
            <button
              disabled={!selectedTime || submitting} // ✅ disabled while submitting
              onClick={handleBooking}
              style={{
                padding: '10px 20px',
                background: '#4CAF50',
                color: '#fff',
                border: 'none',
                cursor: selectedTime && !submitting ? 'pointer' : 'not-allowed',
                opacity: submitting ? 0.6 : 1,
              }}
            >
              {submitting ? 'Reservando...' : 'Reservar'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
