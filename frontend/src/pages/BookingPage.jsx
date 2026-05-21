import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getDoctors } from '../api/doctors';
import { getAvailableSlots, createGuestBooking, createBooking } from '../api/bookings';
import { useAuth } from '../context/useAuth';
import { formatRut, validateRut, cleanRut } from '../utils/rut.js';

export default function BookingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

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
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const isGuest = !user;
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    getDoctors()
      .then((data) => {
        setDoctors(data);
        const doctorParam = searchParams.get('doctor');
        if (doctorParam) {
          const id = Number(doctorParam);
          if (data.some(d => d.id === id)) {
            setSelectedDoctor(id);
          }
        }
      })
      .catch(() => setError('Error cargando doctores'))
      .finally(() => setLoadingDoctors(false));
  }, [searchParams]);

  useEffect(() => {
    if (!selectedDoctor || !date) return;
    getAvailableSlots(selectedDoctor, date)
      .then((data) => { setSlots(data); setSelectedTime(null); })
      .catch(() => setError('Error cargando horarios'));
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

      if (isGuest) {
        await createGuestBooking({
          doctor_id: selectedDoctor,
          date,
          time: selectedTime,
          rut: cleanRut(form.rut),
          name: form.name,
          email: form.email,
          phone: form.phone,
        });
      } else {
        await createBooking({
          doctor_id: selectedDoctor,
          date,
          time: selectedTime,
        });
      }

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
    <div className="page-container bk-page">
      <h1 style={{ marginBottom: 24 }}>Reservar Hora Médica</h1>

      {error && <div className="alert alert-error">{error}</div>}

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

      {step === 1 && (
        <div>
          <div className="form-group" style={{ maxWidth: 280 }}>
            <label className="form-label">Fecha de la cita</label>
            <input
              type="date"
              value={date}
              min={today}
              onChange={(e) => { setDate(e.target.value); setSlots([]); setSelectedTime(null); }}
              className="form-input"
            />
          </div>

          <div className="bk-two-col">
            <div className="bk-doctors-col">
              <h3 className="bk-col-title">Selecciona un especialista</h3>
              {loadingDoctors && <p style={{ color: 'var(--text-muted)' }}>Cargando especialistas...</p>}
              <div className="bk-doctor-list">
                {doctors.map((doc) => (
                  <div
                    key={doc.id}
                    className={`bk-doctor-item ${selectedDoctor === doc.id ? 'bk-doctor-selected' : ''}`}
                    onClick={() => { setSelectedDoctor(doc.id); setSlots([]); setSelectedTime(null); }}
                  >
                    <div className="bk-doctor-avatar">👨‍⚕️</div>
                    <div className="bk-doctor-meta">
                      <span className="bk-doctor-item-name">{doc.name}</span>
                      <span className="bk-doctor-item-spec">{doc.specialty}</span>
                    </div>
                    {selectedDoctor === doc.id && <span className="bk-check">✓</span>}
                  </div>
                ))}
              </div>
            </div>

            <div className="bk-slots-col">
              <h3 className="bk-col-title">Horarios disponibles</h3>
              {!selectedDoctor && (
                <div className="bk-slots-placeholder">
                  <div className="bk-slots-placeholder-icon">👈</div>
                  <p>Selecciona un especialista</p>
                </div>
              )}
              {selectedDoctor && !date && (
                <div className="bk-slots-placeholder">
                  <div className="bk-slots-placeholder-icon">📅</div>
                  <p>Selecciona una fecha</p>
                </div>
              )}
              {selectedDoctor && date && slots.length === 0 && (
                <div className="bk-slots-placeholder">
                  <div className="bk-slots-placeholder-icon">⏰</div>
                  <p>No hay horarios disponibles para esta fecha</p>
                </div>
              )}
              {selectedDoctor && date && slots.length > 0 && (
                <div className="bk-slots-grid">
                  {slots.map((slot) => (
                    <button
                      key={slot}
                      className={`bk-slot-btn ${selectedTime === slot ? 'bk-slot-selected' : ''}`}
                      onClick={() => setSelectedTime(slot)}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

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

      {step === 2 && (
        <div>
          <div className="booking-summary">
            <h3>Resumen de tu cita</h3>
            <div className="summary-items">
              <span><strong>Doctor:</strong> {doctors.find(d => d.id === selectedDoctor)?.name}</span>
              <span><strong>Fecha:</strong> {date}</span>
              <span><strong>Hora:</strong> {selectedTime}</span>
            </div>
          </div>

          {isGuest ? (
            <div className="user-badge user-badge-guest">🔓 Reservando como invitado</div>
          ) : (
            <div className="user-badge user-badge-logged">🔒 Sesión iniciada como <strong>{user.email}</strong></div>
          )}

          <div className="card">
            <h3 style={{ marginBottom: 20 }}>Datos Personales</h3>
            <div className="grid grid-2">
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
