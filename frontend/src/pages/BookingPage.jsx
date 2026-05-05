import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDoctors } from '../api/doctors';
import { getAvailableSlots, createGuestBooking } from '../api/bookings';
import { useAuth } from '../context/AuthContext';
import { formatRut, validateRut, cleanRut } from '../utils/rut.js';

export default function BookingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [date, setDate] = useState('');
  const [slots, setSlots] = useState([]);
  const [selectedTime, setSelectedTime] = useState(null);

  const [form, setForm] = useState({
    rut: user?.rut || '',
    name: user?.name || user?.email?.split('@')[0] || '',
    email: user?.email || '',
    phone: user?.phone || '',
  });

  const [loadingDoctors, setLoadingDoctors] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const isGuest = !user;
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    getDoctors()
      .then(setDoctors)
      .catch(() => setError('Error cargando doctores'))
      .finally(() => setLoadingDoctors(false));
  }, []);

  useEffect(() => {
    if (!selectedDoctor || !date) return;
    setLoadingSlots(true);
    setError(null);
    getAvailableSlots(selectedDoctor, date)
      .then((data) => { setSlots(data); setSelectedTime(null); })
      .catch(() => setError('Error cargando horarios'))
      .finally(() => setLoadingSlots(false));
  }, [selectedDoctor, date]);

  const handleRutChange = (e) => {
    setForm({ ...form, rut: formatRut(e.target.value) });
    setError(null);
  };

  const handleConfirm = async () => {
    if (submitting) return;

    if (isGuest) {
      if (!validateRut(cleanRut(form.rut))) {
        setError('RUT inválido. Verifica el dígito verificador.');
        return;
      }
      if (!form.email) {
        setError('El email es obligatorio para enviarte la confirmación.');
        return;
      }
    }

    try {
      setSubmitting(true);
      setError(null);

      await createGuestBooking({
        doctor_id: selectedDoctor,
        date,
        time: selectedTime,
        rut: isGuest ? cleanRut(form.rut) : cleanRut(form.rut),
        name: form.name,
        email: form.email,
        phone: form.phone,
      });

      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al reservar');
    } finally {
      setSubmitting(false);
    }
  };

  const canGoToStep2 = selectedDoctor && date && selectedTime;

  if (success) {
    return (
      <div className="page-container">
        <div className="card" style={{ textAlign: 'center', padding: 48 }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>✅</div>
          <h2 style={{ color: 'var(--primary-700)', marginBottom: 8 }}>¡Reserva realizada!</h2>
          <p style={{ fontSize: 16, marginBottom: 16 }}>
            Revisa tu email <strong>{form.email}</strong> para confirmar tu cita.
          </p>
          <div className="alert alert-warning" style={{ maxWidth: 500, margin: '0 auto 24px' }}>
            ⚠️ Debes confirmar tu cita. Si no lo haces, tu RUT será bloqueado por <strong>7 días</strong>.
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => navigate('/my-bookings/guest')} className="btn btn-success">
              Ver mis Reservas
            </button>
            <button onClick={() => navigate('/')} className="btn btn-ghost">
              Volver al Inicio
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <h1 style={{ marginBottom: 24 }}>Reservar Hora Médica</h1>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Steps */}
      <div className="steps">
        <div className={`step ${step === 1 ? 'active' : step > 1 ? 'completed' : ''}`}>
          <div className="step-number">{step > 1 ? '✓' : '1'}</div>
          <span className="step-label">Doctor, Fecha y Hora</span>
        </div>
        <div className={`step-line ${step > 1 ? 'completed' : step === 1 ? '' : ''}`} />
        <div className={`step ${step === 2 ? 'active' : ''}`}>
          <div className="step-number">2</div>
          <span className="step-label">Confirmar Datos</span>
        </div>
      </div>

      {/* STEP 1 */}
      {step === 1 && (
        <div>
          {/* Date */}
          <div className="form-group" style={{ maxWidth: 240 }}>
            <label className="form-label">Fecha de la cita</label>
            <input
              type="date"
              value={date}
              min={today}
              onChange={(e) => { setDate(e.target.value); setSlots([]); setSelectedTime(null); }}
              className="form-input"
            />
          </div>

          {/* Doctors */}
          <h3 style={{ fontSize: 16, color: 'var(--text-secondary)', marginBottom: 16, fontWeight: 500 }}>Selecciona un especialista</h3>
          {loadingDoctors && <p style={{ color: 'var(--text-muted)' }}>Cargando especialistas...</p>}
          <div className="grid grid-3 doctor-card-grid">
            {doctors.map((doc) => (
              <div
                key={doc.id}
                className={`doctor-card ${selectedDoctor === doc.id ? 'selected' : ''}`}
                onClick={() => { setSelectedDoctor(doc.id); setSlots([]); setSelectedTime(null); }}
              >
                <div className="doctor-avatar">👨‍⚕️</div>
                <h4>{doc.name}</h4>
                <p>{doc.specialty}</p>
              </div>
            ))}
          </div>

          {/* Time Slots */}
          {selectedDoctor && date && (
            <div style={{ marginTop: 28 }}>
              <h3 style={{ fontSize: 16, color: 'var(--text-secondary)', marginBottom: 16, fontWeight: 500 }}>Horarios disponibles</h3>
              {loadingSlots && <p style={{ color: 'var(--text-muted)' }}>Cargando horarios...</p>}
              {!loadingSlots && slots.length === 0 && (
                <div className="empty-state" style={{ padding: 24 }}>
                  <p>No hay horarios disponibles para esta fecha</p>
                </div>
              )}
              <div className="time-slots">
                {slots.map((slot) => (
                  <button
                    key={slot}
                    className={`time-slot ${selectedTime === slot ? 'selected' : ''}`}
                    onClick={() => setSelectedTime(slot)}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Continue */}
          <div style={{ marginTop: 32, display: 'flex', justifyContent: 'flex-end' }}>
            {canGoToStep2 ? (
              <button onClick={() => setStep(2)} className="btn btn-primary btn-lg">
                Continuar →
              </button>
            ) : (
              <button disabled className="btn btn-ghost btn-lg">
                Selecciona doctor, fecha y hora
              </button>
            )}
          </div>
        </div>
      )}

      {/* STEP 2 */}
      {step === 2 && (
        <div>
          {/* Summary */}
          <div className="booking-summary">
            <h3>Resumen de tu cita</h3>
            <div className="summary-items">
              <span><strong>Doctor:</strong> {doctors.find(d => d.id === selectedDoctor)?.name}</span>
              <span><strong>Fecha:</strong> {date}</span>
              <span><strong>Hora:</strong> {selectedTime}</span>
            </div>
          </div>

          {/* Badge */}
          {isGuest ? (
            <div className="user-badge user-badge-guest">🔓 Reservando como invitado</div>
          ) : (
            <div className="user-badge user-badge-logged">🔒 Sesión iniciada como <strong>{user.email}</strong></div>
          )}

          {/* Form */}
          <div className="card">
            <h3 style={{ marginBottom: 20 }}>Datos Personales</h3>
            <div className="grid grid-2">
              {/* RUT */}
              <div className="form-group">
                <label className="form-label">RUT <span className="required">*</span></label>
                <input
                  value={form.rut}
                  onChange={isGuest ? handleRutChange : undefined}
                  disabled={!isGuest}
                  placeholder="12.345.678-5"
                  className="form-input"
                />
                {isGuest && <p className="form-hint">Ingresa tu RUT chileno válido</p>}
              </div>

              {/* Name */}
              <div className="form-group">
                <label className="form-label">Nombre completo</label>
                <input
                  value={form.name}
                  onChange={isGuest ? (e) => setForm({ ...form, name: e.target.value }) : undefined}
                  disabled={!isGuest}
                  placeholder="Tu nombre"
                  className="form-input"
                />
              </div>

              {/* Email */}
              <div className="form-group">
                <label className="form-label">Email <span className="required">*</span></label>
                <input
                  value={form.email}
                  onChange={isGuest ? (e) => setForm({ ...form, email: e.target.value }) : undefined}
                  disabled={!isGuest}
                  placeholder="tu@email.com"
                  className="form-input"
                />
                {isGuest && <p className="form-hint">Necesario para enviar confirmación</p>}
              </div>

              {/* Phone */}
              <div className="form-group">
                <label className="form-label">Teléfono</label>
                <input
                  value={form.phone}
                  onChange={isGuest ? (e) => setForm({ ...form, phone: e.target.value }) : undefined}
                  disabled={!isGuest}
                  placeholder="+56 9 1234 5678"
                  className="form-input"
                />
              </div>
            </div>

            {!isGuest && (
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8, fontStyle: 'italic' }}>
                Datos tomados de tu perfil. Para modificarlos, contacta a administración.
              </p>
            )}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 28 }}>
            <button onClick={() => setStep(1)} className="btn btn-ghost btn-lg">
              ← Volver
            </button>
            <button
              onClick={handleConfirm}
              disabled={submitting}
              className="btn btn-primary btn-lg"
            >
              {submitting ? 'Reservando...' : 'Confirmar Reserva'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
