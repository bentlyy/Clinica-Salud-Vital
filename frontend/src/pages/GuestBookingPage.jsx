import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDoctors } from '../api/doctors';
import { getAvailableSlots, createGuestBooking } from '../api/bookings';
import { formatRut, validateRut, cleanRut } from '../utils/rut.js';

export default function GuestBookingPage() {
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [date, setDate] = useState('');
  const [slots, setSlots] = useState([]);
  const [selectedTime, setSelectedTime] = useState(null);

  const [form, setForm] = useState({ rut: '', name: '', email: '', phone: '' });

  const [loadingDoctors, setLoadingDoctors] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
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

  const handleRutChange = (e) => {
    setForm({ ...form, rut: formatRut(e.target.value) });
    setError(null);
  };

  const handleBooking = async () => {
    if (submitting) return;

    if (!validateRut(cleanRut(form.rut))) {
      setError('RUT inválido. Verifica el dígito verificador.');
      return;
    }

    if (!form.email) {
      setError('Email es obligatorio para enviarte la confirmación.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      setSuccessMsg(null);

      await createGuestBooking({
        doctor_id: selectedDoctor,
        date,
        time: selectedTime,
        rut: cleanRut(form.rut),
        name: form.name,
        email: form.email,
        phone: form.phone,
      });

      setSuccessMsg('Reserva creada. Revisa tu email para confirmar la cita.');
      setSelectedTime(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al reservar');
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle = { width: '100%', padding: '10px 12px', border: '1px solid #ccc', borderRadius: 6, fontSize: 15, boxSizing: 'border-box' };
  const labelStyle = { display: 'block', marginBottom: 6, fontWeight: 'bold', color: '#333' };

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '20px' }}>
      <h2 style={{ color: '#1976d2' }}>Reservar hora como invitado</h2>
      <p style={{ color: '#666', marginBottom: 20 }}>Completa tus datos para reservar. Recibirás un email para confirmar tu cita.</p>

      {error && (
        <div style={{ background: '#ffebee', color: '#c62828', padding: 10, borderRadius: 6, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {successMsg && (
        <div style={{ background: '#e8f5e9', color: '#2e7d32', padding: 10, borderRadius: 6, marginBottom: 16 }}>
          {successMsg}
          <br />
          <button onClick={() => navigate('/my-bookings/guest')} style={{ marginTop: 8, padding: '6px 12px', background: '#4CAF50', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
            Ver mis reservas por RUT
          </button>
        </div>
      )}

      <div style={{ background: '#f5f5f5', padding: 20, borderRadius: 12, marginBottom: 20 }}>
        <h3 style={{ marginTop: 0 }}>Tus datos</h3>

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>RUT <span style={{ color: '#e53935' }}>*</span></label>
          <input value={form.rut} onChange={handleRutChange} placeholder="12.345.678-5" style={inputStyle} />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Nombre (opcional)</label>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Tu nombre completo" style={inputStyle} />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Email <span style={{ color: '#e53935' }}>*</span></label>
          <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="tu@email.com" style={inputStyle} />
          <span style={{ fontSize: 12, color: '#888' }}>Necesario para enviarte el link de confirmación</span>
        </div>

        <div style={{ marginBottom: 0 }}>
          <label style={labelStyle}>Teléfono (opcional)</label>
          <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+56 9 1234 5678" style={inputStyle} />
        </div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <label style={labelStyle}>Fecha</label>
        <input
          type="date"
          value={date}
          min={new Date().toISOString().split('T')[0]}
          onChange={(e) => {
            setDate(e.target.value);
            setSlots([]);
            setSelectedTime(null);
            setSuccessMsg(null);
          }}
          style={{ ...inputStyle, maxWidth: 200 }}
        />
      </div>

      <h3>Selecciona un doctor</h3>

      {loadingDoctors && <p>Cargando doctores...</p>}

      <div style={{ display: 'grid', gap: 10 }}>
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
              border: selectedDoctor === doc.id ? '2px solid #1976d2' : '1px solid #ccc',
              padding: 12,
              borderRadius: 8,
              cursor: 'pointer',
              background: selectedDoctor === doc.id ? '#e3f2fd' : '#fff',
            }}
          >
            <h4 style={{ margin: '0 0 4px' }}>{doc.name}</h4>
            <p style={{ margin: 0, color: '#666' }}>{doc.specialty}</p>
          </div>
        ))}
      </div>

      {selectedDoctor && date && (
        <div style={{ marginTop: 20 }}>
          <h3>Horarios disponibles</h3>

          {loadingSlots && <p>Cargando horarios...</p>}

          {!loadingSlots && slots.length === 0 && <p>No hay horarios disponibles para esta fecha</p>}

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {slots.map((slot) => (
              <button
                key={slot}
                onClick={() => setSelectedTime(slot)}
                style={{
                  padding: '8px 12px',
                  cursor: 'pointer',
                  borderRadius: 4,
                  border: '1px solid #ccc',
                  background: selectedTime === slot ? '#1976d2' : '#eee',
                  color: selectedTime === slot ? '#fff' : '#000',
                }}
              >
                {slot}
              </button>
            ))}
          </div>

          <div style={{ marginTop: 16 }}>
            <button
              disabled={!selectedTime || submitting}
              onClick={handleBooking}
              style={{
                padding: '12px 24px',
                background: '#1976d2',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                cursor: selectedTime && !submitting ? 'pointer' : 'not-allowed',
                opacity: submitting ? 0.6 : 1,
                fontSize: 16,
                fontWeight: 'bold',
              }}
            >
              {submitting ? 'Reservando...' : 'Reservar cita'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
