import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/useTheme';
import { getDoctors } from '../api/doctors';
import { getAvailableSlots, createGuestBooking } from '../api/bookings';
import { formatRut, validateRut, cleanRut } from '../utils/rut.js';

export default function GuestBookingPage() {
  const { theme } = useTheme();
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



  const inputStyle = { width: '100%', padding: '10px 12px', border: '1px solid var(--border-medium)', borderRadius: 6, fontSize: 15, boxSizing: 'border-box', background: 'var(--bg-secondary)', color: 'var(--text-primary)' };
  const labelStyle = { display: 'block', marginBottom: 6, fontWeight: 'bold', color: 'var(--text-primary)' };

  const handleRutChange = (e) => {
    const raw = e.target.value;
    const cleaned = cleanRut(raw);
    if (cleaned.length <= 9) {
      setForm({ ...form, rut: formatRut(cleaned) });
    }
  };

  const handleBooking = async () => {
    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const cleaned = cleanRut(form.rut);
      if (!validateRut(cleaned)) {
        setError('RUT inválido');
        setSubmitting(false);
        return;
      }
      await createGuestBooking({
        doctor_id: selectedDoctor,
        date,
        time: selectedTime,
        rut: cleaned,
        name: form.name || undefined,
        email: form.email,
        phone: form.phone || undefined,
      });
      setSuccessMsg('Reserva creada. Revisa tu email para confirmar la cita.');
      setForm({ rut: '', name: '', email: '', phone: '' });
      setSelectedDoctor(null);
      setDate('');
      setSlots([]);
      setSelectedTime(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al reservar');
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    getDoctors().then((res) => {
      setDoctors(res.data || []);
      setLoadingDoctors(false);
    }).catch(() => setLoadingDoctors(false));
  }, []);

  useEffect(() => {
    if (selectedDoctor && date) {
      setLoadingSlots(true);
      getAvailableSlots(selectedDoctor, date).then((res) => {
        setSlots(res.data || []);
        setLoadingSlots(false);
      }).catch(() => {
        setSlots([]);
        setLoadingSlots(false);
      });
    }
  }, [selectedDoctor, date]);

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '20px' }}>
      <h2 style={{ color: 'var(--accent-600)' }}>Reservar hora como invitado</h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: 20 }}>Completa tus datos para reservar. Recibirás un email para confirmar tu cita.</p>

      {error && (
        <div style={{ background: 'var(--danger-50)', color: 'var(--danger-600)', padding: 10, borderRadius: 6, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {successMsg && (
        <div style={{ background: 'var(--primary-50)', color: 'var(--primary-700)', padding: 10, borderRadius: 6, marginBottom: 16 }}>
          {successMsg}
          <br />
          <button onClick={() => navigate('/my-bookings/guest')} style={{ marginTop: 8, padding: '6px 12px', background: 'var(--primary-500)', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
            Ver mis reservas por RUT
          </button>
        </div>
      )}

      <div style={{ background: 'var(--bg-secondary)', padding: 20, borderRadius: 12, marginBottom: 20 }}>
        <h3 style={{ marginTop: 0 }}>Tus datos</h3>

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>RUT <span style={{ color: 'var(--danger-500)' }}>*</span></label>
          <input value={form.rut} onChange={handleRutChange} placeholder="12.345.678-5" style={inputStyle} />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Nombre (opcional)</label>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Tu nombre completo" style={inputStyle} />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Email <span style={{ color: 'var(--danger-500)' }}>*</span></label>
          <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="tu@email.com" style={inputStyle} />
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Necesario para enviarte el link de confirmación</span>
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